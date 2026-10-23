import JSZip from 'jszip'
import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { format } from 'date-fns'
import type { Invoice, UserProfile } from '@/types'
import { InvoicePdfDocument } from '@/components/pdf/pdf-document'
import { invoicePdfFilename, invoicePdfProps } from '@/lib/invoice-pdf'
import { saveBlob, type SaveFilter } from '@/lib/native/save-file'

async function generateInvoicePdf(invoice: Invoice, userProfile: UserProfile): Promise<Blob> {
  return pdf(createElement(InvoicePdfDocument, invoicePdfProps(invoice, userProfile.logo))).toBlob()
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
    // Two drafts on the same day would otherwise share a name and overwrite each other
    let filename = invoicePdfFilename(invoice)
    for (let n = 2; zip.file(filename); n++) filename = invoicePdfFilename(invoice).replace(/\.pdf$/, ` (${n}).pdf`)
    zip.file(filename, pdfBlob)

    if (onProgress) {
      onProgress((i + 1) / invoices.length)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Save a Blob via the native save dialog (Tauri) or browser download (web).
 * Returns true if the file was saved, false if the user cancelled.
 */
export async function downloadBlob(
  blob: Blob,
  filename: string,
  filters?: SaveFilter[],
): Promise<boolean> {
  return saveBlob(blob, { suggestedName: filename, filters })
}

/**
 * Get the default ZIP filename with today's date.
 */
export function getZipFilename(): string {
  return `invoices-export-${format(new Date(), 'yyyy-MM-dd')}.zip`
}
