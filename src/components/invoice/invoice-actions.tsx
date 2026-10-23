import { useState } from 'react'
import { Download, FileText, Loader2, MoreHorizontal, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { templateService } from '@/db'
import type { InvoiceFormState } from '@/hooks/use-invoice-form'
import type { InvoiceStatus } from '@/types'
import { formatCurrency } from '@/lib/pdf-utils'
import { invoiceTotal } from '@/lib/invoice-amounts'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InvoiceActionsProps {
  onSaveDraft: () => void | Promise<void>
  onDownloadPdf: () => void | Promise<void>
  onSendInvoice: () => Promise<void>
  isNew: boolean
  isDirty: boolean
  status: InvoiceStatus
  form: InvoiceFormState
  /** Templates saved from an invoice stay linked to its client, so they can be scheduled. */
  clientId?: string
}

function useBusy() {
  const [busy, setBusy] = useState(false)
  const run = async (task: () => void | Promise<void>) => {
    setBusy(true)
    try {
      await task()
    } finally {
      setBusy(false)
    }
  }
  return [busy, run] as const
}

export function InvoiceActions({
  onSaveDraft,
  onDownloadPdf,
  onSendInvoice,
  isNew,
  isDirty,
  status,
  form,
  clientId,
}: InvoiceActionsProps) {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [isSaving, runSave] = useBusy()
  const [isDownloading, runDownload] = useBusy()
  const [isSending, runSend] = useBusy()

  const total = invoiceTotal(form)
  const isDraft = status === 'draft'

  async function handleSaveTemplate() {
    if (!templateName.trim()) return
    setIsSavingTemplate(true)
    try {
      await templateService.create({
        name: templateName.trim(),
        clientId,
        title: form.title,
        lineItems: form.lineItems,
        expenses: form.expenses,
        notes: form.notes,
        // Keep the number out of the template so each invoice gets its own
        paymentReference:
          form.paymentDetails.reference === form.invoiceNumber ? '' : form.paymentDetails.reference,
        pdfTemplate: form.pdfTemplate,
      })
      toast.success(`Template "${templateName.trim()}" saved`)
      setTemplateDialogOpen(false)
      setTemplateName('')
    } catch (err) {
      console.error('Failed to save template:', err)
      toast.error('The template was not saved. Try again.')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-card/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="mr-auto">
          <p className="text-xs text-muted-foreground">Total</p>
          <AnimatedNumber
            value={total}
            format={(n) => formatCurrency(n, form.currency)}
            duration={350}
            className="block text-xl leading-tight font-semibold tracking-tight tabular"
          />
        </div>

        <Button variant="ghost" onClick={() => runDownload(onDownloadPdf)} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
          PDF
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTemplateDialogOpen(true)}>
              <FileText />
              Save as template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={isDraft ? 'outline' : isDirty || isNew ? 'default' : 'outline'}
          onClick={() => runSave(onSaveDraft)}
          disabled={isSaving || (!isDirty && !isNew)}
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          {isNew ? 'Save draft' : isDirty ? 'Save changes' : 'Saved'}
        </Button>

        <Button
          variant={isDraft ? 'default' : 'outline'}
          disabled={isSending}
          onClick={() => runSend(onSendInvoice)}
        >
          {isSending ? <Loader2 className="animate-spin" /> : <Send />}
          {isDraft ? 'Send invoice' : 'Email again'}
        </Button>
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Keeps the work, expenses, notes and PDF style so the next invoice like this starts filled in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="templateName">Template name</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Monthly retainer"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSaveTemplate()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSavingTemplate || !templateName.trim()}>
              {isSavingTemplate ? 'Saving…' : 'Save template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
