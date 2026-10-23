import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { profileService } from '@/db'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { NotificationPanel } from '@/components/dashboard/notification-panel'
import { NextNumbers } from '@/components/dashboard/next-numbers'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { CalendarView } from '@/components/dashboard/calendar-view'
import { EarningsPanel } from '@/components/dashboard/earnings-panel'
import { PageHeader } from '@/components/layout/page-header'
import { openNewInvoice } from '@/components/invoice/new-invoice-dialog'

function greeting(name: string) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const first = name.trim().split(/\s+/)[0]
  return first ? `${part}, ${first}` : part
}

export default function DashboardPage() {
  const profile = useLiveQuery(() => profileService.get())

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile ? greeting(profile.name) : 'Dashboard'}
        description="Here is where your invoices stand."
        actions={
          <Button onClick={openNewInvoice}>
            <Plus />
            New invoice
          </Button>
        }
      />

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabs defaultValue="overview" className="min-w-0">
          <TabsList>
            <TabsTrigger value="overview">Earnings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-3 animate-page">
            <EarningsPanel />
          </TabsContent>
          <TabsContent value="calendar" className="mt-3 animate-page">
            <CalendarView />
          </TabsContent>
        </Tabs>

        <aside className="space-y-6">
          <NotificationPanel />
          <NextNumbers />
          <RecentActivity />
        </aside>
      </div>
    </div>
  )
}
