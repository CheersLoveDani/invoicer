import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientList } from '@/components/clients/client-list'
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <FileText className="mb-4 size-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">Templates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Templates management coming soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
