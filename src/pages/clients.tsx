import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientList } from '@/components/clients/client-list'
import { TemplateList } from '@/components/templates/template-list'
import { FileText, Users } from 'lucide-react'

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Clients & Templates
        </h2>
        <p className="mt-1 text-muted-foreground">
          Manage your clients and invoice templates.
        </p>
      </div>

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
        </TabsList>

        <TabsContent value="clients" className="mt-6">
          <ClientList />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
