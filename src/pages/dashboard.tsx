import { Link } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { NotificationPanel } from '@/components/dashboard/notification-panel'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { useNotifications } from '@/hooks/use-notifications'

export default function DashboardPage() {
  const { notifications, dismiss } = useNotifications()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Your invoicing overview at a glance.
        </p>
      </div>

      {/* Notifications */}
      <NotificationPanel notifications={notifications} onDismiss={dismiss} />

      {/* Stats */}
      <StatsCards />

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/invoices/new">
            <FileText className="mr-2 h-4 w-4" />
            New from Template
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <RecentActivity />
          </div>
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Calendar view coming soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
