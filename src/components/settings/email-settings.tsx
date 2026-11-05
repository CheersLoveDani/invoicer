import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { ExternalLink, Loader2, Save, Send, Trash2 } from 'lucide-react'
import { db, profileService, settingsService } from '@/db'
import { GMAIL_DEFAULTS, mail, smtpLogin } from '@/lib/native/mail'
import { errorMessage, renderInvoicePdf, styledEmail } from '@/lib/invoice-mailer'
import { addDays } from 'date-fns'
import { isTauri } from '@/lib/runtime'
import type { SmtpSecurity, SmtpSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const APP_PASSWORDS_URL = 'https://myaccount.google.com/apppasswords'

const blank: SmtpSettings = { ...GMAIL_DEFAULTS, fromEmail: '', fromName: '', username: '' }

async function openExternal(url: string) {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function BackgroundToggle() {
  const enabled = useLiveQuery(async () => (await settingsService.get()).runInBackground ?? false)

  async function handleChange(next: boolean) {
    try {
      await settingsService.save({ runInBackground: next })
      toast.success(next ? 'Invoicer will keep running in the tray' : 'Invoicer will quit when closed')
    } catch {
      toast.error('The setting was not saved. Try again.')
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label htmlFor="runInBackground">Run in the background</Label>
        <p className="text-sm text-muted-foreground">
          Starts Invoicer when you sign in and keeps it in the tray when you close the window, so
          scheduled invoices go out on time.
        </p>
      </div>
      <Switch id="runInBackground" checked={enabled ?? false} onCheckedChange={handleChange} disabled={enabled === undefined} />
    </div>
  )
}

export function EmailSettings() {
  const saved = useLiveQuery(async () => (await db.appSettings.get('app-settings'))?.smtp ?? null)
  const profileName = useLiveQuery(async () => (await profileService.get()).name)

  const [form, setForm] = useState<SmtpSettings>(blank)
  const [password, setPassword] = useState('')
  const [testTo, setTestTo] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null)

  // Fill the form once when the saved account loads
  const loaded = useRef(false)
  useEffect(() => {
    if (saved === undefined || loaded.current) return
    loaded.current = true
    if (!saved) return
    setForm(saved)
    mail.hasPassword(smtpLogin(saved)).then(setHasPassword, () => setHasPassword(false))
  }, [saved])

  if (!mail.supported) {
    return (
      <Section
        title="Send from your own account"
        description="Sending email straight from Invoicer needs the desktop app. In the browser, Send invoice opens a draft in your mail app instead."
      >
        {null}
      </Section>
    )
  }

  const update = <K extends keyof SmtpSettings>(key: K, value: SmtpSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  /** Saves the account; returns false (after saying why) if it could not. */
  async function persist(): Promise<boolean> {
    if (!form.fromEmail.trim()) {
      toast.error('Enter the email address to send from.')
      return false
    }
    const login = smtpLogin(form)
    const previousLogin = saved ? smtpLogin(saved) : null
    const loginChanged = previousLogin !== null && previousLogin !== login
    if (!password && (!hasPassword || loginChanged)) {
      toast.error('Enter the app password for this account.')
      return false
    }
    try {
      // Google shows app passwords in groups of four; the spaces are not part of it
      const secret = form.host.trim().toLowerCase() === 'smtp.gmail.com' ? password.replace(/\s+/g, '') : password
      if (password) await mail.savePassword(login, secret)
      if (loginChanged) await mail.deletePassword(previousLogin).catch(() => {})
      await settingsService.save({
        smtp: { ...form, fromEmail: form.fromEmail.trim(), username: form.username.trim(), host: form.host.trim() },
      })
      setPassword('')
      setHasPassword(true)
      return true
    } catch (err) {
      toast.error(errorMessage(err))
      return false
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setBusy('save')
    if (await persist()) toast.success('Email account saved')
    setBusy(null)
  }

  async function handleTest() {
    setBusy('test')
    try {
      if (!(await persist())) return
      const [profile, settings] = await Promise.all([profileService.get(), settingsService.get()])
      const sender = form.fromName.trim() || profile.name || ''
      const today = new Date()
      const sample = {
        invoiceNumber: 'TEST0001',
        title: 'Sample work (this is a test)',
        date: today,
        dueDate: addDays(today, 30),
        from: { name: sender, email: form.fromEmail.trim(), address: profile.address, phone: profile.phone },
        to: { name: 'ACME Ltd', email: '', address: '', phone: '' },
        lineItems: [
          { id: 'sample-1', type: 'fixed' as const, description: 'Website design', price: 950 },
          { id: 'sample-2', type: 'hourly' as const, description: 'Content updates', rate: 50, hours: 5, price: 250 },
        ],
        expenses: [{ id: 'sample-3', type: 'expense' as const, description: 'Stock photos', price: 50 }],
        notes: 'This is a test invoice from Invoicer. Nothing is owed.',
        pdfTemplate: settings.defaultPdfTemplate || 'elegant',
        currency: profile.defaultCurrency || 'GBP',
        paymentDetails: {
          bankAccountName: profile.bankAccountName,
          bankName: profile.bankName,
          bankSortCode: profile.bankSortCode,
          bankAccountNumber: profile.bankAccountNumber,
          reference: 'TEST0001',
        },
      }
      const body = `This is a test from Invoicer, showing how your invoice emails will look. The amounts are made up, and a sample invoice is attached.

Kind regards,
${sender}`
      await mail.send({ ...form, fromName: sender }, {
        to: testTo.trim() || form.fromEmail.trim(),
        subject: 'Invoicer test email',
        body,
        ...(await styledEmail(sample, body, profile.logo)),
        attachment: { name: 'Invoice-TEST0001.pdf', data: await renderInvoicePdf(sample, profile.logo) },
      })
      toast.success(`Test email sent to ${testTo.trim() || form.fromEmail.trim()}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove() {
    if (!saved) return
    setBusy('remove')
    try {
      await mail.deletePassword(smtpLogin(saved))
      await settingsService.save({ smtp: undefined })
      setForm(blank)
      setPassword('')
      setHasPassword(false)
      toast.success('Email account removed')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <Section
        title="Send from your own account"
        description="Invoicer emails invoices, with the PDF attached, from your address. Gmail keeps a copy in your Sent folder."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fromEmail">Email address</Label>
            <Input
              id="fromEmail"
              type="email"
              autoComplete="off"
              placeholder="you@gmail.com"
              value={form.fromEmail}
              onChange={(e) => update('fromEmail', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromName">Name on emails</Label>
            <Input
              id="fromName"
              placeholder={profileName || 'Your name'}
              value={form.fromName}
              onChange={(e) => update('fromName', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="appPassword">App password</Label>
          <Input
            id="appPassword"
            type="password"
            autoComplete="new-password"
            placeholder={hasPassword ? 'Saved. Type a new one to replace it.' : '16 letters from Google'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            For Gmail, turn on 2-Step Verification, then{' '}
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-0.5 font-medium text-foreground underline underline-offset-2"
              onClick={() => void openExternal(APP_PASSWORDS_URL)}
            >
              create an app password
              <ExternalLink className="size-3" />
            </button>
            . It is kept in your computer's secure password store, not in Invoicer's data or backups.
          </p>
        </div>

        <details className="group rounded-lg border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Server settings</summary>
          <p className="mt-1 text-xs text-muted-foreground">Already set for Gmail. Change these only for another provider.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">Server</Label>
              <Input id="smtpHost" value={form.host} onChange={(e) => update('host', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">Port</Label>
              <Input
                id="smtpPort"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => update('port', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpSecurity">Encryption</Label>
              <Select value={form.security} onValueChange={(v) => update('security', v as SmtpSecurity)}>
                <SelectTrigger id="smtpSecurity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">SSL/TLS (usually port 465)</SelectItem>
                  <SelectItem value="starttls">STARTTLS (usually port 587)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUsername">Login</Label>
              <Input
                id="smtpUsername"
                autoComplete="off"
                placeholder={form.fromEmail || 'Same as email address'}
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
              />
            </div>
          </div>
        </details>

        <div className="space-y-2">
          <Label htmlFor="testTo">Send test email to</Label>
          <Input
            id="testTo"
            type="email"
            autoComplete="off"
            placeholder={form.fromEmail || 'Your email address'}
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Leave empty to send it to yourself.</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {saved && (
            <Button type="button" variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={handleRemove} disabled={busy !== null}>
              {busy === 'remove' ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remove account
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleTest} disabled={busy !== null}>
            {busy === 'test' ? <Loader2 className="animate-spin" /> : <Send />}
            Send test email
          </Button>
          <Button type="submit" disabled={busy !== null}>
            {busy === 'save' ? <Loader2 className="animate-spin" /> : <Save />}
            Save account
          </Button>
        </div>
      </Section>

      <Section
        title="Scheduled sending"
        description="Choose what each schedule does when it is due on the Scheduled page."
      >
        <BackgroundToggle />
      </Section>
    </form>
  )
}
