import { useState } from 'react'
import { Download, FileText, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { templateService } from '@/db'
import type { InvoiceFormState } from '@/hooks/use-invoice-form'
import { Button } from '@/components/ui/button'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface InvoiceActionsProps {
  onSaveDraft: () => void
  onDownloadPdf: () => void
  onSendInvoice: () => void
  isNew: boolean
  form: InvoiceFormState
}

export function InvoiceActions({
  onSaveDraft,
  onDownloadPdf,
  onSendInvoice,
  isNew,
  form,
}: InvoiceActionsProps) {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    setIsSavingTemplate(true)
    try {
      await templateService.create({
        name: templateName.trim(),
        title: form.title,
        lineItems: form.lineItems,
        expenses: form.expenses,
        notes: form.notes,
        paymentReference: form.paymentDetails.reference,
        pdfTemplate: form.pdfTemplate,
      })
      toast.success('Template saved')
      setTemplateDialogOpen(false)
      setTemplateName('')
    } catch (err) {
      console.error('Failed to save template:', err)
      toast.error('Failed to save template')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  return (
    <>
      <div className="sticky bottom-0 z-10 border-t bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onSaveDraft}>
            <Save className="size-4" />
            {isNew ? 'Save as Draft' : 'Save'}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" disabled onClick={onDownloadPdf}>
                    <Download className="size-4" />
                    Download PDF
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Available after PDF generation is built</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" disabled onClick={onSendInvoice}>
                    <Send className="size-4" />
                    Send Invoice
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Available after email integration is built</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="secondary"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <FileText className="size-4" />
            Save as Template
          </Button>
        </div>
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save the current invoice form as a reusable template. Line items,
              expenses, notes, and PDF settings will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Monthly Retainer"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveTemplate()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
            >
              {isSavingTemplate ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
