import { useEffect, useRef, useState } from 'react'
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

  // Fill the form once when settings load; later saves (such as a theme change) must not wipe edits
  const loaded = useRef(false)
  useEffect(() => {
    if (settings && !loaded.current) {
      loaded.current = true
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

    // The theme applies and saves straight away
    if (key === 'theme') {
      setTheme(value as Theme)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await settingsService.save(form)
      toast.success('Preferences saved')
    } catch {
      toast.error('Preferences were not saved. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Appearance */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[15px] font-semibold">Appearance</h3>
          <p className="text-sm text-muted-foreground">
            Changes apply straight away.
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

      {/* Invoice defaults */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[15px] font-semibold">Invoice defaults</h3>
          <p className="text-sm text-muted-foreground">
            Used when you start a new invoice.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defaultDueDays">Payment due after (days)</Label>
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
              0 means due on receipt.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPdfTemplate">PDF style</Label>
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
          <h3 className="text-[15px] font-semibold">Backup reminders</h3>
          <p className="text-sm text-muted-foreground">
            Your data lives only on this computer, so back it up now and then.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backupReminderDays">
            Remind me after (days)
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
            0 turns reminders off.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save />
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </form>
  )
}
