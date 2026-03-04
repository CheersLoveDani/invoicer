import { useParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useInvoiceForm } from '@/hooks/use-invoice-form'
import { InvoiceForm } from '@/components/invoice/invoice-form'
import { InvoiceActions } from '@/components/invoice/invoice-actions'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const invoiceForm = useInvoiceForm()
  const { form, save, isLoading, mode } = invoiceForm

  const isNew = mode !== 'edit'

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {isNew ? 'New Invoice' : 'Edit Invoice'}
        </h2>
        {id && (
          <p className="mt-1 text-sm text-muted-foreground">
            Editing invoice {form.invoiceNumber || id}
          </p>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel: form (~60%) */}
        <ScrollArea className="flex-3 border-r">
          <div className="p-6">
            <InvoiceForm invoiceForm={invoiceForm} />
          </div>
        </ScrollArea>

        {/* Right panel: PDF preview placeholder (~40%) */}
        <div className="hidden flex-2 lg:block">
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-6">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
              <FileText className="mx-auto mb-3 size-12 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                PDF preview will appear here
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Preview updates as you edit the invoice
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <InvoiceActions
        onSaveDraft={() => save()}
        onDownloadPdf={() => {}}
        onSendInvoice={() => {}}
        isNew={isNew}
        form={form}
      />
    </div>
  )
}
