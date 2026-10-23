import { addMonths, format, startOfMonth, startOfYear, subMonths } from 'date-fns'
import type { Currency, Invoice } from '@/types'
import { CHART_COLORS, OTHER_COLOR } from '@/lib/chart-colors'
import { amountForMode, expenseAmount, incomeAmount, type ChartViewMode } from '@/lib/invoice-amounts'

export type DateRange = 'last6' | 'last12' | 'thisYear' | 'all'

export const RANGE_LABELS: Record<DateRange, string> = {
  last6: 'Last 6 months',
  last12: 'Last 12 months',
  thisYear: 'This year',
  all: 'All time',
}

export const OTHER = 'Other clients'
const NAMED_CLIENTS = CHART_COLORS.length - 1

function rangeStart(range: DateRange): Date | null {
  const now = new Date()
  switch (range) {
    case 'last6':
      return startOfMonth(subMonths(now, 5))
    case 'last12':
      return startOfMonth(subMonths(now, 11))
    case 'thisYear':
      return startOfYear(now)
    case 'all':
      return null
  }
}

const clientOf = (inv: Invoice) => inv.to.name.trim() || 'No client'

/** Paid invoices in one currency, so amounts are never summed across currencies. */
export function paidIn(invoices: Invoice[], currency: Currency): Invoice[] {
  return invoices.filter((inv) => inv.status === 'paid' && inv.paidAt && inv.currency === currency)
}

/**
 * A colour per client that does not change with the range or mode picked:
 * the biggest clients of all time get the named colours, the rest are "Other".
 */
export function clientColors(paid: Invoice[]): Map<string, string> {
  const totals = new Map<string, number>()
  for (const inv of paid) totals.set(clientOf(inv), (totals.get(clientOf(inv)) ?? 0) + incomeAmount(inv) + expenseAmount(inv))
  const ranked = [...totals.entries()].sort(([, a], [, b]) => b - a).map(([name]) => name)
  return new Map(ranked.map((name, i) => [name, i < NAMED_CLIENTS ? CHART_COLORS[i] : OTHER_COLOR]))
}

export function colorFor(colors: Map<string, string>, client: string): string {
  return colors.get(client) ?? OTHER_COLOR
}

/** The client a series is drawn under: named, or folded into "Other". */
export function seriesFor(colors: Map<string, string>, client: string): string {
  return colorFor(colors, client) === OTHER_COLOR ? OTHER : client
}

export function inRange(paid: Invoice[], range: DateRange): Invoice[] {
  const start = rangeStart(range)
  return start ? paid.filter((inv) => new Date(inv.paidAt!) >= start) : paid
}

export interface MonthRow {
  month: string
  label: string
  total: number
  [series: string]: string | number
}

export interface Series {
  key: string
  name: string
  color: string
}

export function monthlyRows(
  paid: Invoice[],
  range: DateRange,
  mode: ChartViewMode,
  colors: Map<string, string>,
): { rows: MonthRow[]; series: Series[] } {
  const shown = inRange(paid, range)
  const now = new Date()
  const earliest = shown.reduce<Date>((min, inv) => {
    const d = new Date(inv.paidAt!)
    return d < min ? d : min
  }, now)
  let cursor = startOfMonth(rangeStart(range) ?? earliest)
  const rows: MonthRow[] = []
  const byMonth = new Map<string, MonthRow>()
  while (cursor <= now) {
    const row: MonthRow = { month: format(cursor, 'yyyy-MM'), label: format(cursor, 'MMM yy'), total: 0 }
    rows.push(row)
    byMonth.set(row.month, row)
    cursor = addMonths(cursor, 1)
  }

  const add = (row: MonthRow, key: string, amount: number) => {
    row[key] = Number(row[key] ?? 0) + amount
    row.total += amount
  }

  const used = new Set<string>()
  for (const inv of shown) {
    const row = byMonth.get(format(new Date(inv.paidAt!), 'yyyy-MM'))
    if (!row) continue
    if (mode === 'split') {
      add(row, 'income', incomeAmount(inv))
      add(row, 'expense', expenseAmount(inv))
    } else {
      const amount = amountForMode(inv, mode)
      if (amount === 0) continue
      const key = seriesFor(colors, clientOf(inv))
      used.add(key)
      add(row, key, amount)
    }
  }

  if (mode === 'split') {
    return {
      rows,
      series: [
        { key: 'income', name: 'Income', color: 'var(--chart-1)' },
        { key: 'expense', name: 'Expenses', color: 'var(--chart-3)' },
      ],
    }
  }

  // Series in the clients' fixed colour order, "Other" last
  const order = [...new Set([...colors.keys()].map((c) => seriesFor(colors, c)))]
  const series = order
    .filter((key) => used.has(key))
    .map((key) => ({ key, name: key, color: key === OTHER ? OTHER_COLOR : colorFor(colors, key) }))
  for (const row of rows) for (const s of series) row[s.key] ??= 0
  return { rows, series }
}

export interface ClientTotal {
  name: string
  color: string
  income: number
  expense: number
}

export function clientTotals(paid: Invoice[], range: DateRange, colors: Map<string, string>): ClientTotal[] {
  const totals = new Map<string, ClientTotal>()
  for (const inv of inRange(paid, range)) {
    const name = clientOf(inv)
    const entry = totals.get(name) ?? { name, color: colorFor(colors, name), income: 0, expense: 0 }
    entry.income += incomeAmount(inv)
    entry.expense += expenseAmount(inv)
    totals.set(name, entry)
  }
  return [...totals.values()].sort((a, b) => b.income + b.expense - (a.income + a.expense))
}
