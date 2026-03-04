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
  isSameDay,
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
import type { Invoice, Schedule, Client, InvoiceTemplate } from '@/types'
import { CalendarDayDetail } from './calendar-day-detail'

type DotColor = 'green' | 'blue' | 'red' | 'orange'

interface EventDot {
  color: DotColor
  label: string
}

const DOT_COLORS: Record<DotColor, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
}

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

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart.getTime(), gridEnd.getTime()]
  )

  // Load all invoices and active schedules
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? []
  const schedules = useLiveQuery(() => db.schedules.where('active').equals(1).toArray()) ?? []
  const clients = useLiveQuery(() => db.clients.toArray()) ?? []
  const templates = useLiveQuery(() => db.templates.toArray()) ?? []

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
      if (inv.status === 'sent') {
        const dueDate = new Date(inv.dueDate)
        const now = new Date()
        if (dueDate <= now) {
          const key = toDateKey(dueDate)
          addDot(key, { color: 'red', label: 'Overdue' })
        }
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
      if (inv.status === 'paid' && inv.paidAt) {
        addInvoice(toDateKey(new Date(inv.paidAt)), inv)
      }
      if (inv.sentAt) {
        addInvoice(toDateKey(new Date(inv.sentAt)), inv)
      }
      if (inv.status === 'sent') {
        addInvoice(toDateKey(new Date(inv.dueDate)), inv)
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
    <div className="space-y-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
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
                      flex min-h-[4rem] flex-col items-center gap-1 border-b border-r p-1.5 text-sm transition-colors
                      hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                      ${!inCurrentMonth ? 'text-muted-foreground/40' : ''}
                    `}
                  >
                    <span
                      className={`
                        flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium
                        ${today ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                        ${isSameDay(day, new Date()) && inCurrentMonth ? 'font-bold' : ''}
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
                            className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[dot.color]}`}
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
    </div>
  )
}
