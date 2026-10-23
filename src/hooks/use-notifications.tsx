import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns'
import { db } from '@/db'
import { scheduleService, settingsService } from '@/db'
import { isOverdue } from '@/lib/invoice-amounts'
import { nativeNotify } from '@/lib/native/notify'

export interface Notification {
  /** Stable for one occurrence: a schedule's next cycle gets a new id. */
  id: string
  type: 'schedule-due' | 'overdue' | 'backup-reminder'
  message: string
  actionLabel: string
  actionUrl?: string
  scheduleId?: string
  invoiceId?: string
}

const DISMISSED_KEY = 'invoicer-dismissed-notifications'
const FIRED_KEY = 'invoicer-fired-notifications'

function readSet(storage: Storage, key: string): Set<string> {
  try {
    const stored = storage.getItem(key)
    if (stored) return new Set(JSON.parse(stored) as string[])
  } catch {
    // unreadable storage: start empty
  }
  return new Set()
}

function writeSet(storage: Storage, key: string, ids: Set<string>) {
  try {
    storage.setItem(key, JSON.stringify(Array.from(ids)))
  } catch {
    // storage full or blocked: notifications still show in the app
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`

async function computeNotifications(): Promise<Notification[]> {
  const result: Notification[] = []
  const now = new Date()

  const [dueSoon, clients, templates, sent, settings] = await Promise.all([
    scheduleService.getDueSoon(3),
    db.clients.toArray(),
    db.templates.toArray(),
    db.invoices.where('status').equals('sent').toArray(),
    settingsService.get(),
  ])

  for (const schedule of dueSoon) {
    const client = clients.find((c) => c.id === schedule.clientId)
    const template = templates.find((t) => t.id === schedule.templateId)
    if (!client || !template) continue
    const dueDate = new Date(schedule.nextDueDate)
    const days = differenceInCalendarDays(dueDate, now)
    const when = isToday(dueDate)
      ? 'is due today'
      : isTomorrow(dueDate)
        ? 'is due tomorrow'
        : days < 0
          ? `was due ${plural(-days, 'day')} ago`
          : `is due in ${plural(days, 'day')}`
    result.push({
      id: `schedule-${schedule.id}-${format(dueDate, 'yyyy-MM-dd')}`,
      type: 'schedule-due',
      message: `${client.name}: ${template.name} ${when}`,
      actionLabel: 'Create invoice',
      actionUrl: `/invoices/new?template=${template.id}&client=${client.id}&schedule=${schedule.id}`,
      scheduleId: schedule.id,
    })
  }

  for (const invoice of sent.filter((inv) => isOverdue(inv, now))) {
    const days = Math.max(1, differenceInCalendarDays(now, new Date(invoice.dueDate)))
    result.push({
      id: `overdue-${invoice.id}`,
      type: 'overdue',
      message: `${invoice.invoiceNumber || 'An invoice'} to ${invoice.to.name || 'a client'} is ${plural(days, 'day')} overdue`,
      actionLabel: 'Open',
      actionUrl: `/invoices/${invoice.id}`,
      invoiceId: invoice.id,
    })
  }

  if (settings.backupReminderDays > 0) {
    const lastBackup = settings.lastBackupDate ? new Date(settings.lastBackupDate) : null
    const daysSince = lastBackup ? differenceInCalendarDays(now, lastBackup) : Infinity
    if (daysSince > settings.backupReminderDays) {
      result.push({
        id: `backup-reminder-${lastBackup ? format(lastBackup, 'yyyy-MM-dd') : 'never'}`,
        type: 'backup-reminder',
        message: lastBackup
          ? `Your last backup was ${plural(daysSince, 'day')} ago`
          : 'Your data has not been backed up yet',
        actionLabel: 'Back up',
        actionUrl: '/settings?tab=data',
      })
    }
  }

  return result
}

interface NotificationsValue {
  notifications: Notification[]
  dismiss: (id: string) => void
}

const NotificationsContext = createContext<NotificationsValue>({
  notifications: [],
  dismiss: () => {},
})

/** Keeps notifications current as data changes, and raises each one natively once. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const all = useLiveQuery(computeNotifications)
  const [dismissedIds, setDismissedIds] = useState(() => readSet(sessionStorage, DISMISSED_KEY))

  useEffect(() => {
    if (!all) return
    const fired = readSet(localStorage, FIRED_KEY)
    const fresh = all.filter((n) => !fired.has(n.id) && !dismissedIds.has(n.id))
    if (fresh.length === 0) return
    for (const n of fresh) {
      void nativeNotify('Invoicer', n.message)
      fired.add(n.id)
    }
    writeSet(localStorage, FIRED_KEY, fired)
  }, [all, dismissedIds])

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev).add(id)
      writeSet(sessionStorage, DISMISSED_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ notifications: (all ?? []).filter((n) => !dismissedIds.has(n.id)), dismiss }),
    [all, dismissedIds, dismiss],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext)
}
