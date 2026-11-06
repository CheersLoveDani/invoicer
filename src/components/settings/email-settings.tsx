import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarClock, ExternalLink, Loader2, Save, Send, Trash2 } from 'lucide-react'
import { db, invoiceService, profileService, settingsService } from '@/db'
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

function SettingSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean | undefined
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked ?? false} onCheckedChange={onChange} disabled={checked === undefined} />
    </div>
  )
}

function BackgroundToggles() {
  const settings = useLiveQuery(async () => {
    const s = await settingsService.get()
    const background = s.runInBackground ?? false
    return { background, startAtLogin: s.startAtLogin ?? background }
  })

  async function save(patch: { runInBackground?: boolean; startAtLogin?: boolean }, message: string) {
    try {
      // Pin start at sign-in, which otherwise follows background mode
      await settingsService.save({ startAtLogin: settings?.startAtLogin, ...patch })
      toast.success(message)
    } catch {
      toast.error('The setting was not saved. Try again.')
    }
  }

  return (
    <div className="space-y-3">
      <SettingSwitch
        id="runInBackground"
        label="Run in the background"
        description="Closing the window leaves a small tray icon that uses almost no memory. It opens Invoicer out of sight only when an invoice is due, then closes it again."
        checked={settings?.background}
        onChange={(next) =>
          save(
            { runInBackground: next },
            next ? 'Invoicer will stay in the tray when closed' : 'Invoicer will quit when closed',
          )
        }
      />
      <SettingSwitch
        id="startAtLogin"
        label="Open at sign-in"
        description="Starts Invoicer when you sign in to your computer. With Run in the background on, it starts in the tray."
        checked={settings?.startAtLogin}
        onChange={(next) =>
          save(
            { startAtLogin: next },
            next ? 'Invoicer will start when you sign in' : 'Invoicer will not start when you sign in',
          )
        }
      />
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
  const [busy, setBusy] = useState<'save' | 'test' | 'scheduled' | 'remove' | null>(null)
  const navigate = useNavigate()

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

  /** A made-up invoice from your real profile and bank details. */
  async function buildSample(toEmail: string) {
    const [profile, settings] = await Promise.all([profileService.get(), settingsService.get()])
    const sender = form.fromName.trim() || profile.name || ''
    const today = new Date()
    const sample = {
      invoiceNumber: 'TEST0001',
      title: 'Sample work (this is a test)',
      status: 'draft' as const,
      date: today,
      dueDate: addDays(today, 30),
      from: { name: sender, email: form.fromEmail.trim(), address: profile.address, phone: profile.phone },
      to: { name: 'Test client', email: toEmail, address: '', phone: '' },
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
    return { sample, sender, profile }
  }

  /** Puts a sample invoice in the outbox, as a schedule set to ask first would. */
  async function handleScheduledTest() {
    setBusy('scheduled')
    try {
      if (!(await persist())) return
      const { sample } = await buildSample(testTo.trim() || form.fromEmail.trim())
      await invoiceService.create({
        ...sample,
        outbox: { state: 'awaiting-approval', attempts: 0, test: true },
      })
      toast.success('A test invoice is waiting for your OK')
      navigate('/scheduled')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleTest() {
    setBusy('test')
    try {
      if (!(await persist())) return
      const { sample, sender, profile } = await buildSample(testTo.trim() || form.fromEmail.trim())
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
          <Button type="button" variant="outline" onClick={handleScheduledTest} disabled={busy !== null}>
            {busy === 'scheduled' ? <Loader2 className="animate-spin" /> : <CalendarClock />}
            Test a scheduled invoice
          </Button>
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
        <BackgroundToggles />
      </Section>
    </form>
  )
}
