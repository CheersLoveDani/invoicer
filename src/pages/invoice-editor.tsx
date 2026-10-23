import { useState, useCallback, useEffect } from 'react'
import { useBlocker, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import { useInvoiceForm } from '@/hooks/use-invoice-form'
import { invoiceService, clientService, profileService } from '@/db'
import { generateEmailContent, type EmailContent } from '@/lib/email-utils'
import { invoicePdfFilename, invoicePdfProps } from '@/lib/invoice-pdf'
import { InvoiceForm } from '@/components/invoice/invoice-form'
import { InvoiceActions } from '@/components/invoice/invoice-actions'
import { PdfDragCard } from '@/components/invoice/pdf-drag-card'
import { SendInvoiceDialog } from '@/components/invoice/send-invoice-dialog'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { InvoicePdfDocument } from '@/components/pdf/pdf-document'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { saveBlob } from '@/lib/native/save-file'
import { cn } from '@/lib/utils'

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const invoiceForm = useInvoiceForm()
  const { form, save, markSent, isLoading, mode, isDirty, hasUnsavedChanges } = invoiceForm
  const logo = useLiveQuery(async () => (await profileService.get()).logo)

  const [showPreview, setShowPreview] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfFilename, setPdfFilename] = useState('')
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)

  const isNew = mode !== 'edit'

  // The page stays mounted between invoices; a PDF made for one must not be offered for the next.
  // A just-created invoice (new -> its own id) keeps its card.
  useEffect(() => {
    if (id && id === savedInvoiceId) return
    setPdfBlob(null)
    setEmailContent(null)
    setSavedInvoiceId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Ask before leaving with unsaved edits, inside the app and when closing the window
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const handleSave = useCallback(async () => {
    try {
      await save()
    } catch (err) {
      console.error('Failed to save invoice:', err)
      toast.error('The invoice was not saved. Try again.')
    }
  }, [save])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  const renderPdf = useCallback(
    () => pdf(<InvoicePdfDocument {...invoicePdfProps(form, logo)} />).toBlob(),
    [form, logo],
  )

  // A PDF that leaves the app is a real invoice, so it is saved first.
  // Otherwise it could be sent and then lost when the editor is closed.
  const handleDownloadPdf = useCallback(async () => {
    if (isNew || hasUnsavedChanges()) {
      try {
        await save()
      } catch (err) {
        console.error('Failed to save invoice:', err)
        toast.error('The invoice was not saved, so no PDF was made. Try again.')
        return
      }
    }
    try {
      const saved = await saveBlob(await renderPdf(), {
        suggestedName: invoicePdfFilename(form),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
      if (saved) toast.success('PDF saved')
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast.error('The PDF could not be made. Try again.')
    }
  }, [form, renderPdf, isNew, hasUnsavedChanges, save])

  const handleSendInvoice = useCallback(async () => {
    try {
      const invoiceId = await save()
      setSavedInvoiceId(invoiceId)
      setPdfBlob(await renderPdf())
      setPdfFilename(invoicePdfFilename(form))

      let clientTemplate: { emailSubject?: string; emailBody?: string } | undefined
      if (invoiceForm.selectedClient) {
        const client = await clientService.getById(invoiceForm.selectedClient.id)
        if (client?.emailSubject || client?.emailBody) {
          clientTemplate = { emailSubject: client.emailSubject, emailBody: client.emailBody }
        }
      }

      setEmailContent(
        generateEmailContent(
          {
            invoiceNumber: form.invoiceNumber,
            title: form.title,
            to: { name: form.to.name, email: form.to.email },
            lineItems: form.lineItems,
            expenses: form.expenses,
            currency: form.currency,
            notes: form.notes,
          },
          form.from.name,
          clientTemplate,
        ),
      )
      setSendDialogOpen(true)
    } catch (err) {
      console.error('Failed to prepare invoice email:', err)
      toast.error('The invoice could not be prepared for sending. Try again.')
    }
  }, [form, save, renderPdf, invoiceForm.selectedClient])

  const handleConfirmSend = useCallback(async () => {
    if (!savedInvoiceId) return
    try {
      await invoiceService.markSent(savedInvoiceId)
      markSent()
      toast.success(`${form.invoiceNumber || 'Invoice'} marked as sent`)
      setSendDialogOpen(false)
    } catch {
      toast.error('The invoice could not be marked as sent. Try again.')
    }
  }, [savedInvoiceId, markSent, form.invoiceNumber])

  if (isLoading && !savedInvoiceId) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Opening invoice
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 pb-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="truncate text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
            {isNew ? 'New invoice' : form.invoiceNumber || 'Untitled invoice'}
          </h2>
          {!isNew && <InvoiceStatusBadge status={form.status} dueDate={form.dueDate} />}
          {isDirty && (
            <span className="animate-page text-xs text-muted-foreground" aria-live="polite">
              Unsaved changes
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowPreview((prev) => !prev)}>
          {showPreview ? <EyeOff /> : <Eye />}
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={cn('min-w-0 flex-[3] overflow-y-auto', showPreview && 'hidden lg:block')}>
          <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
            <InvoiceForm invoiceForm={invoiceForm} />
          </div>
        </div>

        <div className={cn('min-w-0 flex-[2] border-l bg-muted/40', showPreview ? 'block' : 'hidden lg:block')}>
          <PdfPreview {...invoicePdfProps(form, logo)} />
        </div>
      </div>

      <PdfDragCard pdfBlob={pdfBlob} filename={pdfFilename} />

      <InvoiceActions
        onSaveDraft={handleSave}
        onDownloadPdf={handleDownloadPdf}
        onSendInvoice={handleSendInvoice}
        isNew={isNew}
        isDirty={isDirty}
        status={form.status}
        form={form}
        clientId={invoiceForm.selectedClient?.id}
      />

      {emailContent && (
        <SendInvoiceDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          recipientEmail={emailContent.to}
          subject={emailContent.subject}
          body={emailContent.body}
          onConfirmSend={form.status === 'draft' ? handleConfirmSend : undefined}
        />
      )}

      <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset?.()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>Your changes to this invoice will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
