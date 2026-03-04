import { CleanTemplate } from './pdf-clean'
import type { PdfTemplateProps } from './pdf-clean'
import { ModernTemplate } from './pdf-modern'
import { CompactTemplate } from './pdf-compact'
import type { PdfTemplate } from '@/types'

interface Props extends PdfTemplateProps {
  template: PdfTemplate
}

export function InvoicePdfDocument({ template, ...props }: Props) {
  switch (template) {
    case 'modern':
      return <ModernTemplate {...props} />
    case 'compact':
      return <CompactTemplate {...props} />
    default:
      return <CleanTemplate {...props} />
  }
}
