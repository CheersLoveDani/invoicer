import JSZip from 'jszip'
import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { format } from 'date-fns'
import type { Invoice, UserProfile } from '@/types'
import { InvoicePdfDocument } from '@/components/pdf/pdf-document'

/**
 * Generate a single PDF blob for an invoice.
 */
async function generateInvoicePdf(
  invoice: Invoice,
  _userProfile: UserProfile,
): Promise<Blob> {
  const element = createElement(InvoicePdfDocument, {
    template: invoice.pdfTemplate,
    title: invoice.title,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    from: invoice.from,
    to: {
      name: invoice.to.name,
      email: invoice.to.email,
      address: invoice.to.address,
    },
    lineItems: invoice.lineItems,
    expenses: invoice.expenses,
    notes: invoice.notes,
    paymentDetails: invoice.paymentDetails,
    currency: invoice.currency,
  })

  return pdf(element).toBlob()
}

/**
 * Generate a safe filename for an invoice PDF.
 */
function getInvoiceFilename(invoice: Invoice): string {
  const number = invoice.invoiceNumber || 'draft'
  const date = format(new Date(invoice.date), 'yyyy-MM-dd')
  // Sanitize filename: remove characters that are not safe
  const safeName = `Invoice-${number}-${date}.pdf`.replace(/[<>:"/\\|?*]/g, '_')
  return safeName
}

/**
 * Export multiple invoices as a ZIP file containing individual PDFs.
 *
 * @param invoices - Array of invoices to export
 * @param userProfile - The user profile (for sender info)
 * @param onProgress - Optional callback for progress updates (0 to 1)
 * @returns A Blob containing the ZIP file
 */
export async function exportInvoicesAsZip(
  invoices: Invoice[],
  userProfile: UserProfile,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const zip = new JSZip()

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i]
    const pdfBlob = await generateInvoicePdf(invoice, userProfile)
    const filename = getInvoiceFilename(invoice)
    zip.file(filename, pdfBlob)

    if (onProgress) {
      onProgress((i + 1) / invoices.length)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Trigger a browser download of a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Get the default ZIP filename with today's date.
 */
export function getZipFilename(): string {
  return `invoices-export-${format(new Date(), 'yyyy-MM-dd')}.zip`
}
