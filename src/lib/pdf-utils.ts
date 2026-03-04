import { CURRENCY_SYMBOLS } from '@/types'
import type { Currency, LineItem } from '@/types'
import { format } from 'date-fns'

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  return `${symbol}${amount.toFixed(2)}`
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
