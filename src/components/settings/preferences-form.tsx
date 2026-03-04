import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { settingsService, db } from '@/db'
import { useTheme } from '@/hooks/use-theme'
import type { AppSettings, PdfTemplate, Theme } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save } from 'lucide-react'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const PDF_TEMPLATES: { value: PdfTemplate; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'modern', label: 'Modern' },
  { value: 'compact', label: 'Compact' },
]

export function PreferencesForm() {
  const settings = useLiveQuery(() => db.appSettings.get('app-settings'))
  const { setTheme } = useTheme()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<Omit<AppSettings, 'id' | 'lastBackupDate'>>(
    {
      theme: 'system',
      defaultDueDays: 30,
      defaultPdfTemplate: 'clean',
      backupReminderDays: 30,
    }
  )

  // Sync form state when settings load from DB
  useEffect(() => {
    if (settings) {
      setForm({
        theme: settings.theme,
        defaultDueDays: settings.defaultDueDays,
        defaultPdfTemplate: settings.defaultPdfTemplate,
        backupReminderDays: settings.backupReminderDays,
      })
    }
  }, [settings])

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))

    // Apply theme change immediately for instant feedback
    if (key === 'theme') {
      setTheme(value as Theme)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await settingsService.save(form)
      toast.success('Preferences saved successfully')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Appearance */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Appearance</h3>
          <p className="text-sm text-muted-foreground">
            Customize the look and feel of the application.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={form.theme}
            onValueChange={(val) => updateField('theme', val as Theme)}
          >
            <SelectTrigger id="theme" className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoice Defaults */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Invoice Defaults</h3>
          <p className="text-sm text-muted-foreground">
            Default values for new invoices.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defaultDueDays">Default Due Date Period (days)</Label>
            <Input
              id="defaultDueDays"
              type="number"
              min={0}
              max={365}
              value={form.defaultDueDays}
              onChange={(e) =>
                updateField(
                  'defaultDueDays',
                  Math.max(0, parseInt(e.target.value) || 0)
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of days from invoice date until payment is due.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPdfTemplate">Default PDF Template</Label>
            <Select
              value={form.defaultPdfTemplate}
              onValueChange={(val) =>
                updateField('defaultPdfTemplate', val as PdfTemplate)
              }
            >
              <SelectTrigger
                id="defaultPdfTemplate"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PDF_TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Backup Reminders</h3>
          <p className="text-sm text-muted-foreground">
            Configure how often you are reminded to back up your data.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backupReminderDays">
            Reminder Interval (days)
          </Label>
          <Input
            id="backupReminderDays"
            type="number"
            min={0}
            max={365}
            className="w-full sm:w-[200px]"
            value={form.backupReminderDays}
            onChange={(e) =>
              updateField(
                'backupReminderDays',
                Math.max(0, parseInt(e.target.value) || 0)
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Set to 0 to disable backup reminders.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  )
}
