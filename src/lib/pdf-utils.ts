import { CURRENCY_SYMBOLS } from '@/types'
import type { Currency, LineItem } from '@/types'
import { format } from 'date-fns'

const numberFormats = new Map<Currency, Intl.NumberFormat>()

/** "£1,234.50", "-$20.00", "¥5,000": grouped, with the currency's own decimals. */
export function formatCurrency(amount: number, currency: Currency): string {
  let nf = numberFormats.get(currency)
  if (!nf) {
    const digits = currency === 'JPY' ? 0 : 2
    nf = new Intl.NumberFormat('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    numberFormats.set(currency, nf)
  }
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  return `${amount < 0 ? '-' : ''}${symbol}${nf.format(Math.abs(amount))}`
}

export function calculateTotal(lineItems: LineItem[], expenses: LineItem[]): number {
  const itemsTotal = lineItems.reduce((sum, item) => sum + item.price, 0)
  const expensesTotal = expenses.reduce((sum, item) => sum + item.price, 0)
  return itemsTotal + expensesTotal
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MM/yyyy')
}
