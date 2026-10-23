import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { db } from '@/db/database'
import { isOverdue } from '@/lib/invoice-amounts'
import type { Invoice, Schedule, Client, InvoiceTemplate } from '@/types'
import { CalendarDayDetail } from './calendar-day-detail'

type DotColor = 'green' | 'blue' | 'red' | 'orange' | 'gray'

interface EventDot {
  color: DotColor
  label: string
}

const DOT_COLORS: Record<DotColor, string> = {
  green: 'bg-success',
  blue: 'bg-info',
  red: 'bg-warning',
  orange: 'bg-chart-4',
  gray: 'bg-muted-foreground/60',
}

const LEGEND: { color: DotColor; label: string }[] = [
  { color: 'blue', label: 'Sent' },
  { color: 'gray', label: 'Due' },
  { color: 'red', label: 'Overdue' },
  { color: 'green', label: 'Paid' },
  { color: 'orange', label: 'Scheduled' },
]

// One shared empty list, so memoised maps do not rebuild while data loads
const NONE: never[] = []

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const invoices = useLiveQuery(() => db.invoices.toArray(), [], NONE as Invoice[])
  const schedules = useLiveQuery(() => db.schedules.filter((s) => s.active).toArray(), [], NONE as Schedule[])
  const clients = useLiveQuery(() => db.clients.toArray(), [], NONE as Client[])
  const templates = useLiveQuery(() => db.templates.toArray(), [], NONE as InvoiceTemplate[])

  // Build lookup maps for clients and templates
  const clientMap = useMemo(() => {
    const map = new Map<string, Client>()
    for (const c of clients) map.set(c.id, c)
    return map
  }, [clients])

  const templateMap = useMemo(() => {
    const map = new Map<string, InvoiceTemplate>()
    for (const t of templates) map.set(t.id, t)
    return map
  }, [templates])

  // Compute event dots per day
  const eventMap = useMemo(() => {
    const map = new Map<string, EventDot[]>()

    function addDot(dateKey: string, dot: EventDot) {
      const existing = map.get(dateKey)
      if (existing) {
        // Only add one dot per color per day
        if (!existing.some((d) => d.color === dot.color)) {
          existing.push(dot)
        }
      } else {
        map.set(dateKey, [dot])
      }
    }

    for (const inv of invoices) {
      // Gray dot: draft invoice on its date
      if (inv.status === 'draft') {
        addDot(toDateKey(new Date(inv.date)), { color: 'gray', label: 'Draft' })
        addDot(toDateKey(new Date(inv.dueDate)), { color: 'gray', label: 'Due' })
      }

      // Green dot: paid on that date
      if (inv.status === 'paid' && inv.paidAt) {
        const key = toDateKey(new Date(inv.paidAt))
        addDot(key, { color: 'green', label: 'Paid' })
      }

      // Blue dot: sent on that date
      if (inv.sentAt) {
        const key = toDateKey(new Date(inv.sentAt))
        addDot(key, { color: 'blue', label: 'Sent' })
      }

      // Red dot: overdue (due date passed, still sent status)
      if (isOverdue(inv)) {
        addDot(toDateKey(new Date(inv.dueDate)), { color: 'red', label: 'Overdue' })
      }
    }

    // Orange dot: scheduled invoice due on that date
    for (const sched of schedules) {
      const key = toDateKey(new Date(sched.nextDueDate))
      addDot(key, { color: 'orange', label: 'Scheduled' })
    }

    return map
  }, [invoices, schedules])

  // Build per-day invoice and schedule maps for the popover
  const invoicesByDay = useMemo(() => {
    const map = new Map<string, Invoice[]>()

    function addInvoice(dateKey: string, inv: Invoice) {
      const existing = map.get(dateKey)
      if (existing) {
        if (!existing.some((i) => i.id === inv.id)) {
          existing.push(inv)
        }
      } else {
        map.set(dateKey, [inv])
      }
    }

    for (const inv of invoices) {
      // Show all invoices on their invoice date
      addInvoice(toDateKey(new Date(inv.date)), inv)

      // Show on due date for all non-paid invoices
      if (inv.status !== 'paid') {
        addInvoice(toDateKey(new Date(inv.dueDate)), inv)
      }

      // Show paid invoices on their paid date
      if (inv.status === 'paid' && inv.paidAt) {
        addInvoice(toDateKey(new Date(inv.paidAt)), inv)
      }

      // Show sent invoices on their sent date
      if (inv.sentAt) {
        addInvoice(toDateKey(new Date(inv.sentAt)), inv)
      }
    }

    return map
  }, [invoices])

  const schedulesByDay = useMemo(() => {
    const map = new Map<string, (Schedule & { clientName: string; templateName: string })[]>()

    for (const sched of schedules) {
      const key = toDateKey(new Date(sched.nextDueDate))
      const client = clientMap.get(sched.clientId)
      const template = templateMap.get(sched.templateId)
      const entry = {
        ...sched,
        clientName: client?.name ?? 'Unknown Client',
        templateName: template?.name ?? 'Unknown Template',
      }
      const existing = map.get(key)
      if (existing) {
        existing.push(entry)
      } else {
        map.set(key, [entry])
      }
    }

    return map
  }, [schedules, clientMap, templateMap])

  function goToPrevMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  function goToNextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 key={format(currentMonth, 'yyyy-MM')} className="animate-page text-base font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          {!isSameMonth(currentMonth, new Date()) && (
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
          )}
          <Button variant="outline" size="icon-sm" onClick={goToPrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goToNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <li key={item.color} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${DOT_COLORS[item.color]}`} />
            {item.label}
          </li>
        ))}
      </ul>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells - 6 rows of 7 */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateKey = toDateKey(day)
            const dots = eventMap.get(dateKey) ?? []
            const dayInvoices = invoicesByDay.get(dateKey) ?? []
            const daySchedules = schedulesByDay.get(dateKey) ?? []
            const inCurrentMonth = isSameMonth(day, currentMonth)
            const today = isToday(day)

            return (
              <Popover key={dateKey}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`
                      flex min-h-[4.5rem] cursor-pointer flex-col items-center gap-1.5 border-r border-b p-1.5 text-sm transition-colors
                      [&:nth-child(7n)]:border-r-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=open]:bg-muted/60
                      ${!inCurrentMonth ? 'bg-muted/20 text-muted-foreground/40' : ''}
                    `}
                  >
                    <span
                      className={`
                        flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium tabular
                        ${today ? 'bg-primary font-semibold text-primary-foreground' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Event dots */}
                    {dots.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {dots.map((dot) => (
                          <span
                            key={dot.color}
                            className={`size-1.5 rounded-full ${DOT_COLORS[dot.color]}`}
                            title={dot.label}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <CalendarDayDetail
                    date={day}
                    invoices={dayInvoices}
                    schedules={daySchedules}
                  />
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      </div>
    </section>
  )
}
