import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, CalendarClock, DatabaseBackup, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications, type Notification } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'

const ICONS = {
  overdue: { icon: AlertTriangle, className: 'bg-warning/12 text-warning' },
  'schedule-due': { icon: CalendarClock, className: 'bg-info/10 text-info' },
  'backup-reminder': { icon: DatabaseBackup, className: 'bg-muted text-muted-foreground' },
} as const

function NotificationRow({
  notification,
  onDismiss,
  onAction,
  index,
}: {
  notification: Notification
  onDismiss: (id: string) => void
  onAction: (url: string) => void
  index: number
}) {
  const { icon: Icon, className } = ICONS[notification.type]
  return (
    <div
      className="group flex animate-rise items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
      style={{ '--i': index } as React.CSSProperties}
    >
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', className)}>
        <Icon className="size-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm leading-snug">{notification.message}</p>
      {notification.actionUrl && (
        <Button variant="outline" size="xs" onClick={() => onAction(notification.actionUrl!)}>
          {notification.actionLabel}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss"
      >
        <X />
      </Button>
    </div>
  )
}

/** The dashboard's list of things to deal with; hidden when there are none. */
export function NotificationPanel() {
  const navigate = useNavigate()
  const { notifications, dismiss } = useNotifications()
  if (notifications.length === 0) return null

  return (
    <section className="rounded-xl border bg-card p-3 shadow-card">
      <h3 className="px-2 pt-1 pb-2 text-sm font-semibold">Needs attention</h3>
      <div className="space-y-0.5">
        {notifications.map((n, i) => (
          <NotificationRow key={n.id} notification={n} index={i} onDismiss={dismiss} onAction={navigate} />
        ))}
      </div>
    </section>
  )
}

/** Top-bar bell; shows how many notifications are waiting. */
export function NotificationBell() {
  const navigate = useNavigate()
  const { notifications, dismiss } = useNotifications()
  const count = notifications.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground"
          aria-label={count ? `${count} notifications` : 'Notifications'}
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span
              key={count}
              className="absolute top-1 right-1 flex size-2 animate-pop rounded-full bg-warning ring-2 ring-background"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-2">
        <p className="px-2 pt-1 pb-2 text-sm font-semibold">Notifications</p>
        {count === 0 ? (
          <p className="px-2 pb-3 text-sm text-muted-foreground">Nothing needs your attention.</p>
        ) : (
          <div className="max-h-96 space-y-0.5 overflow-y-auto">
            {notifications.map((n, i) => (
              <NotificationRow key={n.id} notification={n} index={i} onDismiss={dismiss} onAction={navigate} />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
