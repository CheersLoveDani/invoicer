import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { clientService } from '@/db'
import type { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client
  onSaved?: () => void
}

interface ClientFormData {
  name: string
  email: string
  address: string
  invoicePrefix: string
  nextInvoiceNumber: number
  notes: string
  emailSubject: string
  emailBody: string
}

const initialFormData: ClientFormData = {
  name: '',
  email: '',
  address: '',
  invoicePrefix: '',
  nextInvoiceNumber: 1,
  notes: '',
  emailSubject: '',
  emailBody: '',
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: ClientFormDialogProps) {
  const isEdit = !!client
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ClientFormData>(initialFormData)

  useEffect(() => {
    if (open) {
      if (client) {
        setForm({
          name: client.name,
          email: client.email,
          address: client.address,
          invoicePrefix: client.invoicePrefix,
          nextInvoiceNumber: client.nextInvoiceNumber,
          notes: client.notes,
          emailSubject: client.emailSubject ?? '',
          emailBody: client.emailBody ?? '',
        })
      } else {
        setForm(initialFormData)
      }
    }
  }, [open, client])

  const updateField = <K extends keyof ClientFormData>(
    key: K,
    value: ClientFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('Client name is required')
      return
    }
    if (!form.email.trim()) {
      toast.error('Client email is required')
      return
    }

    setSaving(true)
    try {
      if (isEdit && client) {
        await clientService.update(client.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
          nextInvoiceNumber: form.nextInvoiceNumber,
          notes: form.notes.trim(),
          emailSubject: form.emailSubject.trim() || undefined,
          emailBody: form.emailBody.trim() || undefined,
        })
        toast.success('Client updated successfully')
      } else {
        await clientService.create({
          name: form.name.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
          nextInvoiceNumber: form.nextInvoiceNumber,
          notes: form.notes.trim(),
          emailSubject: form.emailSubject.trim() || undefined,
          emailBody: form.emailBody.trim() || undefined,
        })
        toast.success('Client created successfully')
      }
      onOpenChange(false)
      onSaved?.()
    } catch {
      toast.error(isEdit ? 'Failed to update client' : 'Failed to create client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the client details below.'
              : 'Fill in the details to add a new client.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Client or company name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="client@example.com"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-prefix">Invoice Prefix</Label>
              <Input
                id="client-prefix"
                value={form.invoicePrefix}
                onChange={(e) => updateField('invoicePrefix', e.target.value)}
                placeholder="e.g. ACME"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Short code used in invoice numbers
              </p>
            </div>
              <div className="space-y-2">
                <Label htmlFor="client-start-number">
                  {isEdit ? 'Next Invoice #' : 'Starting Invoice #'}
                </Label>
                <Input
                  id="client-start-number"
                  type="number"
                  min={1}
                  value={form.nextInvoiceNumber}
                  onChange={(e) =>
                    updateField(
                      'nextInvoiceNumber',
                      Math.max(1, parseInt(e.target.value) || 1),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {isEdit
                    ? 'Moves on by itself each time an invoice is sent'
                    : 'First invoice number for this client'}
                </p>
              </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-address">Address</Label>
            <Textarea
              id="client-address"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Client address&#10;Line 2&#10;City, Postcode"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-notes">Internal Notes</Label>
            <Textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notes for your reference (not shown on invoices)"
              rows={2}
            />
          </div>

          {/* Email template section */}
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Email Template</p>
            <p className="text-xs text-muted-foreground">
              Customise the email subject and body shown when sending invoices.
              Use placeholders: {'{invoiceNumber}'}, {'{amount}'}, {'{title}'}, {'{clientName}'}, {'{senderName}'}
            </p>
            <div className="space-y-2">
              <Label htmlFor="client-email-subject">Subject</Label>
              <Input
                id="client-email-subject"
                value={form.emailSubject}
                onChange={(e) => updateField('emailSubject', e.target.value)}
                placeholder="Invoice {invoiceNumber} — {senderName}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email-body">Body</Label>
              <Textarea
                id="client-email-body"
                value={form.emailBody}
                onChange={(e) => updateField('emailBody', e.target.value)}
                placeholder={"Dear {clientName},\n\nPlease find attached invoice {invoiceNumber} for {amount} for {title}.\n\nKind regards,\n{senderName}"}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
