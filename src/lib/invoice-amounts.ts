import type { Invoice } from '@/types'

export type ChartViewMode = 'income' | 'expense' | 'combined' | 'split'

export const VIEW_MODE_LABELS: Record<ChartViewMode, string> = {
  income: 'Income only',
  expense: 'Expenses only',
  combined: 'Combined',
  split: 'Income vs expenses',
}

export const INCOME_COLOR = 'hsl(142, 71%, 45%)'
export const EXPENSE_COLOR = 'hsl(0, 84%, 60%)'

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
