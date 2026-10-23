import { endOfDay } from 'date-fns'
import type { Invoice } from '@/types'

export type ChartViewMode = 'income' | 'expense' | 'combined' | 'split'

export const VIEW_MODE_LABELS: Record<ChartViewMode, string> = {
  income: 'Income only',
  expense: 'Expenses only',
  combined: 'Combined',
  split: 'Income vs expenses',
}


export function incomeAmount(invoice: Invoice): number {
  return invoice.lineItems.reduce((sum, li) => sum + li.price, 0)
}

export function expenseAmount(invoice: Invoice): number {
  return invoice.expenses.reduce((sum, li) => sum + li.price, 0)
}

export function amountForMode(
  invoice: Invoice,
  mode: Exclude<ChartViewMode, 'split'>,
): number {
  switch (mode) {
    case 'income':
      return incomeAmount(invoice)
    case 'expense':
      return expenseAmount(invoice)
    case 'combined':
      return incomeAmount(invoice) + expenseAmount(invoice)
  }
}

export function invoiceTotal(invoice: Pick<Invoice, 'lineItems' | 'expenses'>): number {
  return [...invoice.lineItems, ...invoice.expenses].reduce((sum, li) => sum + li.price, 0)
}

/** Sent and unpaid after the whole of its due day has passed. */
export function isOverdue(invoice: Pick<Invoice, 'status' | 'dueDate'>, now = new Date()): boolean {
  return invoice.status === 'sent' && now > endOfDay(new Date(invoice.dueDate))
}
