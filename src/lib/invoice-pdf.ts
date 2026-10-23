import type { PdfTemplateProps } from '@/components/pdf/pdf-clean'
import type { Invoice, PdfTemplate } from '@/types'

type PdfSource = Pick<
  Invoice,
  | 'title'
  | 'invoiceNumber'
  | 'date'
  | 'dueDate'
  | 'from'
  | 'to'
  | 'lineItems'
  | 'expenses'
  | 'notes'
  | 'paymentDetails'
  | 'currency'
  | 'pdfTemplate'
>

/** Everything a PDF template needs, from a saved invoice or the editor form. */
export function invoicePdfProps(
  invoice: PdfSource,
  logo?: string,
): PdfTemplateProps & { template: PdfTemplate } {
  return {
    template: invoice.pdfTemplate,
    title: invoice.title,
    invoiceNumber: invoice.invoiceNumber,
    date: new Date(invoice.date),
    dueDate: new Date(invoice.dueDate),
    from: invoice.from,
    to: { name: invoice.to.name, email: invoice.to.email, address: invoice.to.address },
    lineItems: invoice.lineItems,
    expenses: invoice.expenses,
    notes: invoice.notes,
    paymentDetails: invoice.paymentDetails,
    currency: invoice.currency,
    logo,
  }
}

/** A file name for an invoice PDF that is safe on every OS. */
export function invoicePdfFilename(invoice: Pick<Invoice, 'invoiceNumber' | 'date'>): string {
  const date = new Date(invoice.date)
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `Invoice-${invoice.invoiceNumber || 'draft'}-${stamp}.pdf`.replace(/[<>:"/\\|?*]/g, '_')
}
