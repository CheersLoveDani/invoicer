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
  const templateProps = props
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
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex aspect-[1/1.414] w-full max-w-sm animate-page flex-col items-center justify-center rounded-lg border bg-card p-8 text-center shadow-card">
          <FileText className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">The PDF appears here</p>
          <p className="mt-1 text-xs text-muted-foreground">Pick a client or add an invoice number to start.</p>
        </div>
      </div>
    )
  }

  const { template: dTemplate, ...dTemplateProps } = debouncedProps

  return (
    <div className="relative flex h-full flex-col">
      <div
        className={`pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-popover/95 px-3 py-1 text-xs text-muted-foreground shadow-card backdrop-blur transition-[opacity,transform] duration-200 ${
          isUpdating ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        }`}
        aria-hidden={!isUpdating}
      >
        <Loader2 className="size-3 animate-spin" />
        Updating
      </div>
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
