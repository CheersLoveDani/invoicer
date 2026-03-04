import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { ProfileForm } from '@/components/settings/profile-form'
import { PreferencesForm } from '@/components/settings/preferences-form'
import { DataManagement } from '@/components/settings/data-management'
import { User, SlidersHorizontal, Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-muted-foreground">
          Manage your profile, preferences, and data.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-1.5 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="mr-1.5 h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="pt-6">
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardContent className="pt-6">
              <PreferencesForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardContent className="pt-6">
              <DataManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
