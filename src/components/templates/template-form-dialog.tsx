import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { templateService, clientService } from '@/db'
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
        toast.success('Template updated successfully')
      } else {
        await templateService.create(data)
        toast.success('Template created successfully')
      }
      onOpenChange(false)
      onSaved?.()
    } catch {
      toast.error(isEdit ? 'Failed to update template' : 'Failed to create template')
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
            {isEdit ? 'Edit Template' : 'New Template'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the template details below.'
              : 'Create a reusable invoice template with predefined line items.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <form id="template-form" onSubmit={handleSave} className="space-y-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">
                  Template Name <span className="text-destructive">*</span>
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
                <Label htmlFor="template-client">Linked Client</Label>
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
                placeholder="e.g. Monthly Development Invoice"
              />
            </div>

            <Separator />

            <LineItemEditor
              label="Line Items"
              items={form.lineItems}
              onChange={(lineItems) => updateField('lineItems', lineItems)}
            />

            <Separator />

            <LineItemEditor
              label="Expenses"
              items={form.expenses}
              onChange={(expenses) => updateField('expenses', expenses)}
            />

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="template-notes">Default Notes / Payment Terms</Label>
              <Textarea
                id="template-notes"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Payment terms, bank details, or other notes to include on invoices"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-payment-ref">Payment Reference</Label>
                <Input
                  id="template-payment-ref"
                  value={form.paymentReference}
                  onChange={(e) => updateField('paymentReference', e.target.value)}
                  placeholder="e.g. INV-{number}"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-pdf">PDF Template</Label>
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
            {saving
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
                ? 'Save Changes'
                : 'Create Template'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
