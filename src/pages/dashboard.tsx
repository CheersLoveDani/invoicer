import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, FileText, ChevronDown } from 'lucide-react'
import { db, profileService } from '@/db'
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
import { NextNumbers } from '@/components/dashboard/next-numbers'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { CalendarView } from '@/components/dashboard/calendar-view'
import { EarningsPanel } from '@/components/dashboard/earnings-panel'
import { PageHeader } from '@/components/layout/page-header'

function greeting(name: string) {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const first = name.trim().split(/\s+/)[0]
  return first ? `${part}, ${first}` : part
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const templates = useLiveQuery(() => db.templates.toArray()) ?? []
  const profile = useLiveQuery(() => profileService.get())

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile ? greeting(profile.name) : 'Dashboard'}
        description="Here is where your invoices stand."
        actions={
          <>
            {templates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileText />
                    From a template
                    <ChevronDown className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  {templates.map((t) => (
                    <DropdownMenuItem key={t.id} onClick={() => navigate(`/invoices/new?template=${t.id}`)}>
                      {t.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button asChild>
              <Link to="/invoices/new">
                <Plus />
                New invoice
              </Link>
            </Button>
          </>
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
