import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { profileService, db } from '@/db'
import type { Currency, UserProfile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogoUpload } from './logo-upload'
import { Save } from 'lucide-react'

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'GBP', label: 'GBP - British Pound (£)' },
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'JPY', label: 'JPY - Japanese Yen (¥)' },
  { value: 'CAD', label: 'CAD - Canadian Dollar (C$)' },
  { value: 'AUD', label: 'AUD - Australian Dollar (A$)' },
]

export function ProfileForm() {
  const profile = useLiveQuery(() => db.userProfile.get('user-profile'))
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<Omit<UserProfile, 'id'>>({
    name: '',
    email: '',
    address: '',
    phone: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankSortCode: '',
    bankName: '',
    defaultCurrency: 'GBP',
    logo: undefined,
  })

  // Sync form state when profile loads from DB
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        email: profile.email,
        address: profile.address,
        phone: profile.phone,
        bankAccountName: profile.bankAccountName,
        bankAccountNumber: profile.bankAccountNumber,
        bankSortCode: profile.bankSortCode,
        bankName: profile.bankName,
        defaultCurrency: profile.defaultCurrency,
        logo: profile.logo,
      })
    }
  }, [profile])

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await profileService.save(form)
      toast.success('Profile saved successfully')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Personal Information */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[15px] font-semibold">Personal Information</h3>
          <p className="text-sm text-muted-foreground">
            This information appears on your invoices.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Your full name or business name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+44 7700 900000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <Select
              value={form.defaultCurrency}
              onValueChange={(val) =>
                updateField('defaultCurrency', val as Currency)
              }
            >
              <SelectTrigger id="defaultCurrency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Your business address&#10;Line 2&#10;City, Postcode"
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Bank Details */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[15px] font-semibold">Bank Details</h3>
          <p className="text-sm text-muted-foreground">
            Payment details shown on your invoices.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bankAccountName">Account Name</Label>
            <Input
              id="bankAccountName"
              value={form.bankAccountName}
              onChange={(e) => updateField('bankAccountName', e.target.value)}
              placeholder="Account holder name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={form.bankName}
              onChange={(e) => updateField('bankName', e.target.value)}
              placeholder="e.g. Barclays"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bankAccountNumber">Account Number</Label>
            <Input
              id="bankAccountNumber"
              value={form.bankAccountNumber}
              onChange={(e) =>
                updateField('bankAccountNumber', e.target.value)
              }
              placeholder="12345678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankSortCode">Sort Code</Label>
            <Input
              id="bankSortCode"
              value={form.bankSortCode}
              onChange={(e) => updateField('bankSortCode', e.target.value)}
              placeholder="12-34-56"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Logo */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[15px] font-semibold">Logo</h3>
          <p className="text-sm text-muted-foreground">
            Your logo will appear on generated invoices.
          </p>
        </div>

        <LogoUpload
          value={form.logo}
          onChange={(logo) => updateField('logo', logo)}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  )
}
