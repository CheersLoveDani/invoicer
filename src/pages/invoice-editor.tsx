import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useInvoiceForm } from '@/hooks/use-invoice-form'
import { invoiceService, clientService } from '@/db'
import { generateEmailContent, type EmailContent } from '@/lib/email-utils'
import { InvoiceForm } from '@/components/invoice/invoice-form'
import { InvoiceActions } from '@/components/invoice/invoice-actions'
import { PdfDragCard } from '@/components/invoice/pdf-drag-card'
import { SendInvoiceDialog } from '@/components/invoice/send-invoice-dialog'
import { PdfPreview } from '@/components/pdf/pdf-preview'
import { InvoicePdfDocument } from '@/components/pdf/pdf-document'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const invoiceForm = useInvoiceForm()
  const { form, save, isLoading, mode } = invoiceForm

  const [showPreview, setShowPreview] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfFilename, setPdfFilename] = useState('')
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)

  const isNew = mode !== 'edit'

  const handleDownloadPdf = useCallback(async () => {
    try {
      const blob = await pdf(
        <InvoicePdfDocument
          template={form.pdfTemplate}
          title={form.title}
          invoiceNumber={form.invoiceNumber}
          date={form.date}
          from={form.from}
          to={{ name: form.to.name, email: form.to.email, address: form.to.address }}
          lineItems={form.lineItems}
          expenses={form.expenses}
          notes={form.notes}
          paymentDetails={form.paymentDetails}
          currency={form.currency}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${form.invoiceNumber || 'draft'}-${format(form.date, 'yyyy-MM-dd')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast.error('Failed to generate PDF')
    }
  }, [form])

  const handleSendInvoice = useCallback(async () => {
    try {
      // 1. Save the invoice (ensures it exists in DB and we get an ID)
      const invoiceId = await save()
      setSavedInvoiceId(invoiceId)

      // 2. Generate the PDF blob
      const blob = await pdf(
        <InvoicePdfDocument
          template={form.pdfTemplate}
          title={form.title}
          invoiceNumber={form.invoiceNumber}
          date={form.date}
          from={form.from}
          to={{ name: form.to.name, email: form.to.email, address: form.to.address }}
          lineItems={form.lineItems}
          expenses={form.expenses}
          notes={form.notes}
          paymentDetails={form.paymentDetails}
          currency={form.currency}
        />,
      ).toBlob()

      // 3. Store the blob for the drag card
      const filename = `Invoice-${form.invoiceNumber || 'draft'}-${format(form.date, 'yyyy-MM-dd')}.pdf`
      setPdfBlob(blob)
      setPdfFilename(filename)

      // 4. Look up client email template (if a client is selected)
      let clientTemplate: { emailSubject?: string; emailBody?: string } | undefined
      if (invoiceForm.selectedClient) {
        const client = await clientService.getById(invoiceForm.selectedClient.id)
        if (client?.emailSubject || client?.emailBody) {
          clientTemplate = { emailSubject: client.emailSubject, emailBody: client.emailBody }
        }
      }

      // 5. Generate email content and show dialog
      const email = generateEmailContent(
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
      )
      setEmailContent(email)
      setSendDialogOpen(true)
    } catch (err) {
      console.error('Failed to send invoice:', err)
      toast.error('Failed to send invoice')
    }
  }, [form, save, invoiceForm.selectedClient])

  const handleConfirmSend = useCallback(async () => {
    if (!savedInvoiceId) return
    try {
      await invoiceService.markSent(savedInvoiceId)
      toast.success('Invoice marked as sent')
      setSendDialogOpen(false)
    } catch {
      toast.error('Failed to mark invoice as sent')
    }
  }, [savedInvoiceId])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem-2rem)] flex-col md:h-[calc(100dvh-3.5rem-3rem)]">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isNew ? 'New Invoice' : 'Edit Invoice'}
            </h2>
            {id && (
              <p className="mt-1 text-sm text-muted-foreground">
                Editing invoice {form.invoiceNumber || id}
              </p>
            )}
          </div>
          {/* Mobile preview toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? (
              <>
                <EyeOff className="size-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Preview
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel: form (~60%) — hidden on mobile when preview is shown */}
        <ScrollArea className={`flex-3 border-r ${showPreview ? 'hidden lg:block' : ''}`}>
          <div className="p-6">
            <InvoiceForm invoiceForm={invoiceForm} />
          </div>
        </ScrollArea>

        {/* Right panel: PDF preview (~40%) */}
        <div className={`flex-2 ${showPreview ? 'block' : 'hidden lg:block'}`}>
          <PdfPreview
            template={form.pdfTemplate}
            title={form.title}
            invoiceNumber={form.invoiceNumber}
            date={form.date}
            from={form.from}
            to={{ name: form.to.name, email: form.to.email, address: form.to.address }}
            lineItems={form.lineItems}
            expenses={form.expenses}
            notes={form.notes}
            paymentDetails={form.paymentDetails}
            currency={form.currency}
          />
        </div>
      </div>

      {/* Draggable PDF card — shown after sending */}
      <PdfDragCard pdfBlob={pdfBlob} filename={pdfFilename} />

      {/* Actions bar */}
      <InvoiceActions
        onSaveDraft={() => save()}
        onDownloadPdf={handleDownloadPdf}
        onSendInvoice={handleSendInvoice}
        isNew={isNew}
        form={form}
      />

      {/* Send invoice dialog */}
      {emailContent && (
        <SendInvoiceDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          recipientEmail={emailContent.to}
          subject={emailContent.subject}
          body={emailContent.body}
          onConfirmSend={handleConfirmSend}
        />
      )}
    </div>
  )
}
