import type { Client, Invoice } from '@/types'

/**
 * Invoice numbers follow `${prefix}${number padded to 4}`. A number only
 * counts as "used" once its invoice has been sent or paid, so drafts that are
 * abandoned never push a client's sequence ahead.
 */

export function formatInvoiceNumber(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(4, '0')}`
}

/** The sequence number in an invoice number, if it belongs to `prefix`. */
export function parseInvoiceNumber(prefix: string, invoiceNumber: string): number | null {
  const trimmed = invoiceNumber.trim()
  if (prefix && !trimmed.toUpperCase().startsWith(prefix.toUpperCase())) return null
  const match = trimmed.slice(prefix.length).match(/^\D*(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

export function isNumberUsed(invoice: Pick<Invoice, 'status'>): boolean {
  return invoice.status === 'sent' || invoice.status === 'paid'
}

/**
 * Whether an invoice belongs to a client. Invoices made before `clientId` was
 * stored are matched by their prefix, or by the billed name when the client
 * has no prefix.
 */
export function invoiceBelongsTo(client: Client, invoice: Invoice): boolean {
  if (invoice.clientId) return invoice.clientId === client.id
  if (client.invoicePrefix) return parseInvoiceNumber(client.invoicePrefix, invoice.invoiceNumber) !== null
  return invoice.to.name.trim().toLowerCase() === client.name.trim().toLowerCase()
}

/** The highest number this client has actually sent, or null. */
export function lastUsedNumber(client: Client, invoices: Invoice[]): number | null {
  let last: number | null = null
  for (const invoice of invoices) {
    if (!isNumberUsed(invoice) || !invoiceBelongsTo(client, invoice)) continue
    const n = parseInvoiceNumber(client.invoicePrefix, invoice.invoiceNumber)
    if (n !== null && (last === null || n > last)) last = n
  }
  return last
}

/**
 * The number a new invoice for this client should get: one after the last
 * sent invoice (or the client's starting number), skipping any number already
 * held by another invoice such as an open draft.
 */
export function suggestNextNumber(client: Client, invoices: Invoice[], excludeInvoiceId?: string): string {
  const last = lastUsedNumber(client, invoices)
  let next = Math.max(client.nextInvoiceNumber || 1, last === null ? 1 : last + 1)
  const taken = new Set(
    invoices
      .filter((inv) => inv.id !== excludeInvoiceId)
      .map((inv) => inv.invoiceNumber.trim().toUpperCase()),
  )
  while (taken.has(formatInvoiceNumber(client.invoicePrefix, next).toUpperCase())) next++
  return formatInvoiceNumber(client.invoicePrefix, next)
}
