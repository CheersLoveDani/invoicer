import { useEffect, useState, useCallback } from 'react'
import { differenceInDays, isToday, isTomorrow } from 'date-fns'
import {
  invoiceService,
  scheduleService,
  settingsService,
  clientService,
  templateService,
} from '@/db'

export interface Notification {
  id: string
  type: 'schedule-due' | 'overdue' | 'backup-reminder'
  message: string
  actionLabel: string
  actionUrl?: string
  scheduleId?: string
  invoiceId?: string
}

const DISMISSED_KEY = 'invoicer-dismissed-notifications'

function getDismissedIds(): Set<string> {
  try {
    const stored = sessionStorage.getItem(DISMISSED_KEY)
    if (stored) {
      return new Set(JSON.parse(stored) as string[])
    }
  } catch {
    // ignore parse errors
  }
  return new Set()
}

function saveDismissedIds(ids: Set<string>) {
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)))
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedIds())

  useEffect(() => {
    async function compute() {
      const result: Notification[] = []

      // Scheduled invoices due soon
      try {
        const dueSoon = await scheduleService.getDueSoon(3)
        for (const schedule of dueSoon) {
          const [client, template] = await Promise.all([
            clientService.getById(schedule.clientId),
            templateService.getById(schedule.templateId),
          ])
          if (!client || !template) continue

          const dueDate = new Date(schedule.nextDueDate)
          let when: string
          if (isToday(dueDate)) {
            when = 'today'
          } else if (isTomorrow(dueDate)) {
            when = 'tomorrow'
          } else {
            const days = differenceInDays(dueDate, new Date())
            when = `in ${days} day${days !== 1 ? 's' : ''}`
          }

          result.push({
            id: `schedule-${schedule.id}`,
            type: 'schedule-due',
            message: `${client.name} ${template.name} invoice is due ${when}`,
            actionLabel: 'Create Invoice',
            actionUrl: `/invoices/new?template=${template.id}&client=${client.id}`,
            scheduleId: schedule.id,
          })
        }
      } catch {
        // silently ignore schedule errors
      }

      // Overdue invoices
      try {
        const overdue = await invoiceService.getOverdue()
        for (const invoice of overdue) {
          const days = differenceInDays(new Date(), new Date(invoice.dueDate))
          result.push({
            id: `overdue-${invoice.id}`,
            type: 'overdue',
            message: `Invoice ${invoice.invoiceNumber} is ${days} day${days !== 1 ? 's' : ''} overdue`,
            actionLabel: 'View Invoice',
            actionUrl: `/invoices/${invoice.id}`,
            invoiceId: invoice.id,
          })
        }
      } catch {
        // silently ignore overdue errors
      }

      // Backup reminder
      try {
        const settings = await settingsService.get()
        if (settings.backupReminderDays > 0) {
          const lastBackup = settings.lastBackupDate
            ? new Date(settings.lastBackupDate)
            : null
          const daysSinceBackup = lastBackup
            ? differenceInDays(new Date(), lastBackup)
            : Infinity

          if (daysSinceBackup > settings.backupReminderDays) {
            const message = lastBackup
              ? `It's been ${daysSinceBackup} days since your last data backup`
              : `You haven't backed up your data yet`
            result.push({
              id: 'backup-reminder',
              type: 'backup-reminder',
              message,
              actionLabel: 'Export Now',
              actionUrl: '/settings',
            })
          }
        }
      } catch {
        // silently ignore settings errors
      }

      setNotifications(result)
    }

    compute()
  }, [])

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDismissedIds(next)
      return next
    })
  }, [])

  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id))

  return { notifications: visibleNotifications, dismiss }
}
