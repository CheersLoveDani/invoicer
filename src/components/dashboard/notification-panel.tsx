import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, CalendarClock, Database, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/hooks/use-notifications'

interface NotificationPanelProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'overdue':
      return <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
    case 'schedule-due':
      return <CalendarClock className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
    case 'backup-reminder':
      return <Database className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
  }
}

function getNotificationBorderClass(type: Notification['type']) {
  switch (type) {
    case 'overdue':
      return 'border-l-red-500'
    case 'schedule-due':
      return 'border-l-blue-500'
    case 'backup-reminder':
      return 'border-l-amber-500'
  }
}

export function NotificationPanel({ notifications, onDismiss }: NotificationPanelProps) {
  const navigate = useNavigate()

  if (notifications.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Notifications
          <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {notifications.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-3 rounded-md border-l-4 bg-muted/40 px-3 py-2.5 ${getNotificationBorderClass(notification.type)}`}
          >
            {getNotificationIcon(notification.type)}
            <p className={`min-w-0 flex-1 text-sm ${notification.type === 'overdue' ? 'font-medium' : ''}`}>
              {notification.message}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {notification.actionUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigate(notification.actionUrl!)}
                >
                  {notification.actionLabel}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onDismiss(notification.id)}
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
