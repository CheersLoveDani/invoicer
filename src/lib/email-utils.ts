import type { Currency } from '@/types'
import { formatCurrency } from '@/lib/pdf-utils'
import { isTauri } from '@/lib/runtime'

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
  const amount = formatCurrency(total, invoice.currency)

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

export function mailtoUrl({ to, subject, body }: EmailContent): string {
  // encodeURIComponent keeps line breaks as %0A, which mail apps expect
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Open a pre-filled draft in the system's mail app. */
export async function openEmailDraft(email: EmailContent): Promise<void> {
  const url = mailtoUrl(email)
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else {
    window.location.href = url
  }
}
