import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientList } from '@/components/clients/client-list'
import { TemplateList } from '@/components/templates/template-list'
import { ScheduleList } from '@/components/schedules/schedule-list'
import { CalendarClock, FileText, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients & templates"
        description="Who you bill, what you bill them for, and when it repeats."
      />

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">
            <Users className="size-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="size-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <CalendarClock className="size-4" />
            Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-5 animate-page">
          <ClientList />
        </TabsContent>

        <TabsContent value="templates" className="mt-5 animate-page">
          <TemplateList />
        </TabsContent>

        <TabsContent value="schedules" className="mt-5 animate-page">
          <ScheduleList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
