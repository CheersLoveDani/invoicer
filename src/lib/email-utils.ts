import { CURRENCY_SYMBOLS, type Currency } from '@/types'

export interface EmailContent {
  to: string
  subject: string
  body: string
}

interface InvoiceEmailData {
  invoiceNumber: string
  title: string
  to: { name: string; email: string }
  lineItems: { price: number }[]
  expenses: { price: number }[]
  currency: Currency
  notes?: string
}

interface ClientEmailTemplate {
  emailSubject?: string
  emailBody?: string
}

function applyPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match)
}

export function generateEmailContent(
  invoice: InvoiceEmailData,
  fromName: string,
  clientTemplate?: ClientEmailTemplate,
): EmailContent {
  const total = [...invoice.lineItems, ...invoice.expenses].reduce(
    (sum, li) => sum + li.price,
    0,
  )
  const symbol = CURRENCY_SYMBOLS[invoice.currency]
  const amount = `${symbol}${total.toFixed(2)}`

  const vars: Record<string, string> = {
    invoiceNumber: invoice.invoiceNumber,
    amount,
    title: invoice.title,
    clientName: invoice.to.name,
    senderName: fromName,
  }

  const subject = clientTemplate?.emailSubject
    ? applyPlaceholders(clientTemplate.emailSubject, vars)
    : `Invoice ${invoice.invoiceNumber} — ${fromName}`

  const body = clientTemplate?.emailBody
    ? applyPlaceholders(clientTemplate.emailBody, vars)
    : `Dear ${invoice.to.name},\n\nPlease find attached invoice ${invoice.invoiceNumber} for ${amount} for ${invoice.title}.\n\n${invoice.notes ? invoice.notes + '\n\n' : ''}Kind regards,\n${fromName}`

  return {
    to: invoice.to.email,
    subject,
    body,
  }
}
