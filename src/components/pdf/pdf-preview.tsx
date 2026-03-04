import { useState, useEffect, useRef, memo } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { FileText, Loader2 } from 'lucide-react'
import { InvoicePdfDocument } from './pdf-document'
import type { PdfTemplateProps } from './pdf-clean'
import type { PdfTemplate } from '@/types'

interface PdfPreviewProps extends PdfTemplateProps {
  template: PdfTemplate
}

/**
 * Debounced PDF preview that avoids re-rendering the PDF on every keystroke.
 * Waits 600ms after the last props change before updating.
 */
function PdfPreviewInner(props: PdfPreviewProps) {
  const { template, ...templateProps } = props
  const [debouncedProps, setDebouncedProps] = useState(props)
  const [isUpdating, setIsUpdating] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsUpdating(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedProps(props)
      setIsUpdating(false)
    }, 600)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
    // We stringify to detect deep changes without listing every prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props)])

  // Show placeholder when there's no meaningful data yet
  const hasMinimalData = templateProps.from.name || templateProps.to.name || templateProps.invoiceNumber

  if (!hasMinimalData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-6">
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
          <FileText className="mx-auto mb-3 size-12 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Start filling in the invoice to see a preview
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Preview updates as you edit the invoice
          </p>
        </div>
      </div>
    )
  }

  const { template: dTemplate, ...dTemplateProps } = debouncedProps

  return (
    <div className="relative flex h-full flex-col bg-muted/30">
      {isUpdating && (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-background/80 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          <Loader2 className="size-3 animate-spin" />
          Updating preview...
        </div>
      )}
      <PDFViewer
        style={{ flex: 1, border: 'none' }}
        showToolbar={false}
      >
        <InvoicePdfDocument template={dTemplate} {...dTemplateProps} />
      </PDFViewer>
    </div>
  )
}

export const PdfPreview = memo(PdfPreviewInner)
