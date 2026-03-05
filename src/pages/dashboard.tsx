import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, FileText } from 'lucide-react'
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { NotificationPanel } from '@/components/dashboard/notification-panel'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { CalendarView } from '@/components/dashboard/calendar-view'
import { EarningsChart } from '@/components/dashboard/earnings-chart'
import { ClientBreakdownChart } from '@/components/dashboard/client-breakdown-chart'
import { useNotifications } from '@/hooks/use-notifications'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { notifications, dismiss } = useNotifications()
  const templates = useLiveQuery(() => db.templates.toArray()) ?? []

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={templates.length === 0}>
              <FileText className="mr-2 h-4 w-4" />
              New from Template
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {templates.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => navigate(`/invoices/new?template=${t.id}`)}
              >
                {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="space-y-6">
            {/* Analytics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Earnings Overview</h3>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-[3fr_2fr]">
                <EarningsChart />
                <ClientBreakdownChart />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <RecentActivity />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
