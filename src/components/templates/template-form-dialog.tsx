import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { templateService, clientService, profileService } from '@/db'
import type { InvoiceTemplate, LineItem, PdfTemplate } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { LineItemEditor } from '@/components/line-items/line-item-editor'

interface TemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: InvoiceTemplate
  onSaved?: () => void
}

interface TemplateFormData {
  name: string
  clientId: string
  title: string
  lineItems: LineItem[]
  expenses: LineItem[]
  notes: string
  paymentReference: string
  pdfTemplate: PdfTemplate
}

const initialFormData: TemplateFormData = {
  name: '',
  clientId: '',
  title: '',
  lineItems: [],
  expenses: [],
  notes: '',
  paymentReference: '',
  pdfTemplate: 'clean',
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: TemplateFormDialogProps) {
  const isEdit = !!template
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TemplateFormData>(initialFormData)

  const clients = useLiveQuery(() => clientService.getAll())
  const currency = useLiveQuery(async () => (await profileService.get()).defaultCurrency) ?? 'GBP'

  useEffect(() => {
    if (open) {
      if (template) {
        setForm({
          name: template.name,
          clientId: template.clientId ?? '',
          title: template.title,
          lineItems: template.lineItems,
          expenses: template.expenses,
          notes: template.notes,
          paymentReference: template.paymentReference,
          pdfTemplate: template.pdfTemplate,
        })
      } else {
        setForm(initialFormData)
      }
    }
  }, [open, template])

  const updateField = <K extends keyof TemplateFormData>(
    key: K,
    value: TemplateFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('Template name is required')
      return
    }

    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        clientId: form.clientId || undefined,
        title: form.title.trim(),
        lineItems: form.lineItems,
        expenses: form.expenses,
        notes: form.notes.trim(),
        paymentReference: form.paymentReference.trim(),
        pdfTemplate: form.pdfTemplate,
      }

      if (isEdit && template) {
        await templateService.update(template.id, data)
        toast.success('Template saved')
      } else {
        await templateService.create(data)
        toast.success('Template created')
      }
      onOpenChange(false)
      onSaved?.()
    } catch {
      toast.error('The template was not saved. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl"
        showCloseButton
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? 'Edit template' : 'New template'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Changes apply to invoices you start from this template from now on.'
              : 'Start invoices you send often already filled in.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4">
          <form id="template-form" onSubmit={handleSave} className="space-y-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="template-name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Monthly Retainer"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-client">Client</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(value) =>
                    updateField('clientId', value === '_none' ? '' : value)
                  }
                >
                  <SelectTrigger id="template-client" className="w-full">
                    <SelectValue placeholder="No client linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No client linked</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-title">Invoice Title</Label>
              <Input
                id="template-title"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Monthly development work"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Work</Label>
              <LineItemEditor
                items={form.lineItems}
                onChange={(lineItems) => updateField('lineItems', lineItems)}
                currency={currency}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Expenses</Label>
              <LineItemEditor
                items={form.expenses}
                onChange={(expenses) => updateField('expenses', expenses)}
                currency={currency}
                kind="expenses"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="template-notes">Notes</Label>
              <Textarea
                id="template-notes"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Payment terms or anything else to show on these invoices"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-payment-ref">Payment reference</Label>
                <Input
                  id="template-payment-ref"
                  value={form.paymentReference}
                  onChange={(e) => updateField('paymentReference', e.target.value)}
                  placeholder="Leave empty to use the invoice number"
                />
                <p className="text-xs text-muted-foreground">{'{number}'} is replaced by the invoice number.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-pdf">PDF style</Label>
                <Select
                  value={form.pdfTemplate}
                  onValueChange={(value) =>
                    updateField('pdfTemplate', value as PdfTemplate)
                  }
                >
                  <SelectTrigger id="template-pdf" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">Clean</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="template-form" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
