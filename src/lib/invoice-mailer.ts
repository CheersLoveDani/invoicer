import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { clientService, db, invoiceService, profileService, settingsService } from '@/db'
import { InvoicePdfDocument } from '@/components/pdf/pdf-document'
import { generateEmailContent, type EmailContent } from '@/lib/email-utils'
import { invoicePdfFilename, invoicePdfProps } from '@/lib/invoice-pdf'
import { isMailConfigured, mail } from '@/lib/native/mail'
import type { Invoice, InvoiceOutbox } from '@/types'

/** The email for an invoice, using its client's own wording when they have one. */
export async function invoiceEmailContent(invoice: Invoice): Promise<EmailContent> {
  const client = await clientService.findForInvoice(invoice)
  return generateEmailContent(
    {
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      to: { name: invoice.to.name, email: invoice.to.email },
      lineItems: invoice.lineItems,
      expenses: invoice.expenses,
      currency: invoice.currency,
      notes: invoice.notes,
    },
    invoice.from.name,
    client?.emailSubject || client?.emailBody
      ? { emailSubject: client.emailSubject, emailBody: client.emailBody }
      : undefined,
  )
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Marks an invoice as being sent, so the background sender and a click on
 * Send can never both send it. Returns the invoice as it was before.
 */
export async function claimForSending(
  invoiceId: string,
  canClaim: (invoice: Invoice) => boolean = () => true,
): Promise<Invoice | null> {
  return db.transaction('rw', db.invoices, async () => {
    const invoice = await db.invoices.get(invoiceId)
    if (!invoice || invoice.outbox?.state === 'sending' || !canClaim(invoice)) return null
    await db.invoices.update(invoiceId, {
      outbox: {
        ...invoice.outbox,
        state: 'sending',
        attempts: (invoice.outbox?.attempts ?? 0) + 1,
        lastAttemptAt: Date.now(),
        error: undefined,
      },
    })
    return invoice
  })
}

/** Emails a claimed invoice with its PDF, then records it as sent. */
export async function deliverInvoice(invoice: Invoice): Promise<void> {
  const [settings, profile] = await Promise.all([settingsService.get(), profileService.get()])
  if (!isMailConfigured(settings.smtp)) {
    throw new Error('Email sending is not set up. Add your account in Settings, Email.')
  }
  if (!invoice.to.email.trim()) {
    throw new Error(`${invoice.to.name || 'This client'} has no email address.`)
  }

  const content = await invoiceEmailContent(invoice)
  const pdfBlob = await pdf(createElement(InvoicePdfDocument, invoicePdfProps(invoice, profile.logo))).toBlob()
  await mail.send({ ...settings.smtp, fromName: settings.smtp.fromName.trim() || invoice.from.name }, {
    ...content,
    attachment: { name: invoicePdfFilename(invoice), data: pdfBlob },
  })

  await invoiceService.setOutbox(invoice.id, undefined)
  await invoiceService.markSent(invoice.id)
}

/**
 * Email a saved invoice now, at the user's request. Throws a message fit to
 * show if it was not sent; an outbox entry is kept with the error.
 */
export async function sendInvoiceNow(invoiceId: string): Promise<void> {
  const invoice = await claimForSending(invoiceId)
  if (!invoice) throw new Error('This invoice is already being sent.')
  try {
    await deliverInvoice(invoice)
  } catch (err) {
    const before = invoice.outbox
    if (before) {
      const after: InvoiceOutbox = {
        ...before,
        // Waiting for approval stays that way; anything automatic is now a failure
        state: before.state === 'awaiting-approval' ? 'awaiting-approval' : 'failed',
        attempts: before.attempts + 1,
        lastAttemptAt: Date.now(),
        error: errorMessage(err),
      }
      await invoiceService.setOutbox(invoiceId, after)
    } else {
      await invoiceService.setOutbox(invoiceId, undefined)
    }
    throw err
  }
}
