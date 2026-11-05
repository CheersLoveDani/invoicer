import { addDays } from 'date-fns'
import { v4 as uuid } from 'uuid'
import type { AppSettings, Client, Invoice, InvoiceTemplate, UserProfile } from '@/types'

export type NewInvoiceData = Omit<Invoice, 'id' | 'createdAt'>

/** A draft invoice filled in from a template, for the editor or a schedule. */
export function invoiceFromTemplate(
  template: InvoiceTemplate,
  {
    client,
    profile,
    settings,
    invoiceNumber,
    today = new Date(),
  }: {
    client?: Client
    profile: UserProfile
    settings: AppSettings
    invoiceNumber: string
    today?: Date
  },
): NewInvoiceData {
  return {
    invoiceNumber,
    title: template.title,
    status: 'draft',
    date: today,
    dueDate: addDays(today, settings.defaultDueDays ?? 30),
    from: { name: profile.name, email: profile.email, address: profile.address, phone: profile.phone },
    to: client
      ? { name: client.name, email: client.email, address: client.address, phone: '' }
      : { name: '', email: '', address: '', phone: '' },
    lineItems: template.lineItems.map((li) => ({ ...li, id: uuid() })),
    expenses: template.expenses.map((li) => ({ ...li, id: uuid() })),
    notes: template.notes,
    paymentDetails: {
      bankAccountName: profile.bankAccountName,
      bankAccountNumber: profile.bankAccountNumber,
      bankSortCode: profile.bankSortCode,
      bankName: profile.bankName,
      reference: template.paymentReference
        ? template.paymentReference.replace(/\{number\}/g, invoiceNumber)
        : invoiceNumber,
    },
    currency: profile.defaultCurrency || 'GBP',
    pdfTemplate: template.pdfTemplate,
    templateId: template.id,
    clientId: client?.id,
  }
}
