import { CURRENCY_SYMBOLS } from '@/types'

export function generateMailtoLink(invoice: {
  invoiceNumber: string
  title: string
  to: { name: string; email: string }
  lineItems: { price: number }[]
  expenses: { price: number }[]
  currency: 'GBP' | 'USD' | 'EUR' | 'JPY' | 'CAD' | 'AUD'
  notes?: string
}, fromName: string): string {
  const total = [...invoice.lineItems, ...invoice.expenses].reduce((sum, li) => sum + li.price, 0)
  const symbol = CURRENCY_SYMBOLS[invoice.currency]

  const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} — ${fromName}`)
  const body = encodeURIComponent(
    `Dear ${invoice.to.name},\n\n` +
    `Please find attached invoice ${invoice.invoiceNumber} for ${symbol}${total.toFixed(2)} for ${invoice.title}.\n\n` +
    `${invoice.notes ? invoice.notes + '\n\n' : ''}` +
    `Kind regards,\n${fromName}`
  )

  return `mailto:${invoice.to.email}?subject=${subject}&body=${body}`
}
