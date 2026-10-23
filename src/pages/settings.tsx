import { useSearchParams } from 'react-router-dom'
import { Download, Loader2, RefreshCw, User, SlidersHorizontal, Database, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ProfileForm } from '@/components/settings/profile-form'
import { PreferencesForm } from '@/components/settings/preferences-form'
import { DataManagement } from '@/components/settings/data-management'
import { PageHeader } from '@/components/layout/page-header'
import { APP_VERSION, updater, useUpdateState, type UpdateStatus } from '@/lib/native/updater'

const TABS = ['profile', 'preferences', 'data', 'updates'] as const
type Tab = (typeof TABS)[number]

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-6 shadow-card">{children}</div>
}

function UpdatesPanel() {
  const update = useUpdateState()
  const working = (['checking', 'downloading', 'installing'] as UpdateStatus[]).includes(update.status)

  const message: Record<UpdateStatus, string> = {
    idle: updater.supported
      ? 'Invoicer looks for new versions when it starts and every few hours.'
      : 'Updates are only available in the desktop app.',
    checking: 'Looking for a new version…',
    none: 'You have the latest version.',
    downloading: `Downloading version ${update.version}…`,
    ready: `Version ${update.version} is ready. Restart to start using it.`,
    installing: `Installing version ${update.version}…`,
    failed: `Version ${update.version} could not be installed. Try again.`,
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold">Version {APP_VERSION}</h3>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {message[update.status]}
          </p>
        </div>
        {updater.supported &&
          (update.status === 'ready' || update.status === 'failed' ? (
            <Button onClick={() => void updater.install()}>
              <Download />
              Restart and update
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void updater.check()} disabled={working}>
              {working ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Check for updates
            </Button>
          ))}
      </div>
      {update.notes && (update.status === 'ready' || update.status === 'downloading') && (
        <div className="mt-5 border-t pt-4">
          <p className="mb-1 text-sm font-medium">What is new</p>
          <p className="text-sm whitespace-pre-line text-muted-foreground">{update.notes}</p>
        </div>
      )}
    </Panel>
  )
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') as Tab | null
  const tab: Tab = requested && TABS.includes(requested) ? requested : 'profile'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your details, defaults, backups and updates." />

      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="profile">
            <User />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <SlidersHorizontal />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database />
            Data
          </TabsTrigger>
          <TabsTrigger value="updates">
            <Sparkles />
            Updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5 animate-page">
          <Panel>
            <ProfileForm />
          </Panel>
        </TabsContent>
        <TabsContent value="preferences" className="mt-5 animate-page">
          <Panel>
            <PreferencesForm />
          </Panel>
        </TabsContent>
        <TabsContent value="data" className="mt-5 animate-page">
          <Panel>
            <DataManagement />
          </Panel>
        </TabsContent>
        <TabsContent value="updates" className="mt-5 animate-page">
          <UpdatesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
