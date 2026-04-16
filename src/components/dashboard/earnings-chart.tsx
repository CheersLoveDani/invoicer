import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subMonths, startOfMonth, isAfter, startOfYear } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { db } from '@/db/database'
import { profileService } from '@/db'
import { CURRENCY_SYMBOLS, type Currency, type Invoice } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHART_COLORS } from '@/lib/chart-colors'
import {
  amountForMode,
  expenseAmount,
  incomeAmount,
  type ChartViewMode,
} from '@/lib/invoice-amounts'

type DateRange = 'last6' | 'last12' | 'thisYear' | 'all'

interface MonthRow {
  month: string
  label: string
  total: number
  [key: string]: string | number
}

interface SeriesDef {
  key: string
  name: string
  color: string
  strokeDasharray?: string
}

function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getFilteredStartDate(range: DateRange): Date | null {
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

function getMonthsInRange(
  paid: Invoice[],
  range: DateRange,
  filterStart: Date | null,
): string[] {
  const now = new Date()
  const months: string[] = []
  let cursor: Date

  if (range === 'all' && paid.length > 0) {
    const earliest = paid.reduce(
      (min, inv) => (inv.paidAt! < min ? inv.paidAt! : min),
      paid[0].paidAt!,
    )
    cursor = startOfMonth(earliest)
  } else {
    cursor = new Date(filterStart ?? startOfMonth(now))
  }

  const end = startOfMonth(now)
  while (cursor <= end) {
    months.push(format(cursor, 'yyyy-MM'))
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return months
}

function buildChartData(
  invoices: Invoice[],
  range: DateRange,
  mode: ChartViewMode,
): { rows: MonthRow[]; series: SeriesDef[] } {
  const filterStart = getFilteredStartDate(range)

  const paid = invoices.filter((inv) => {
    if (inv.status !== 'paid' || !inv.paidAt) return false
    if (
      filterStart &&
      !isAfter(inv.paidAt, filterStart) &&
      inv.paidAt.getTime() !== filterStart.getTime()
    ) {
      return false
    }
    return true
  })

  const months = getMonthsInRange(paid, range, filterStart)

  if (mode === 'split') {
    const monthMap = new Map<string, Map<string, { income: number; expense: number }>>()
    const clientTotals = new Map<string, number>()

    for (const inv of paid) {
      const key = format(inv.paidAt!, 'yyyy-MM')
      const inc = incomeAmount(inv)
      const exp = expenseAmount(inv)
      if (inc === 0 && exp === 0) continue
      const clientName = inv.to.name || 'Unknown'

      const entry = monthMap.get(key) ?? new Map<string, { income: number; expense: number }>()
      const cur = entry.get(clientName) ?? { income: 0, expense: 0 }
      cur.income += inc
      cur.expense += exp
      entry.set(clientName, cur)
      monthMap.set(key, entry)

      clientTotals.set(clientName, (clientTotals.get(clientName) ?? 0) + inc + exp)
    }

    const sortedClients = Array.from(clientTotals.entries())
      .filter(([, total]) => total > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name], index) => ({
        name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))

    const series: SeriesDef[] = []
    for (const c of sortedClients) {
      series.push({ key: `${c.name}__income`, name: `${c.name} (income)`, color: c.color })
      series.push({
        key: `${c.name}__expense`,
        name: `${c.name} (expenses)`,
        color: c.color,
        strokeDasharray: '5 5',
      })
    }

    const rows: MonthRow[] = months.map((m) => {
      const entry = monthMap.get(m)
      const row: MonthRow = {
        month: m,
        label: format(new Date(m + '-01'), 'MMM yyyy'),
        total: 0,
      }
      let total = 0
      for (const c of sortedClients) {
        const cur = entry?.get(c.name) ?? { income: 0, expense: 0 }
        row[`${c.name}__income`] = cur.income
        row[`${c.name}__expense`] = cur.expense
        total += cur.income + cur.expense
      }
      row.total = total
      return row
    })

    return { rows, series }
  }

  // Per-client modes (income / expense / combined)
  const monthMap = new Map<string, Map<string, number>>()
  const clientTotals = new Map<string, number>()

  for (const inv of paid) {
    const key = format(inv.paidAt!, 'yyyy-MM')
    const amount = amountForMode(inv, mode)
    if (amount === 0) continue
    const clientName = inv.to.name || 'Unknown'

    const entry = monthMap.get(key) ?? new Map<string, number>()
    entry.set(clientName, (entry.get(clientName) ?? 0) + amount)
    monthMap.set(key, entry)

    clientTotals.set(clientName, (clientTotals.get(clientName) ?? 0) + amount)
  }

  const series: SeriesDef[] = Array.from(clientTotals.entries())
    .filter(([, total]) => total > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name], index) => ({
      key: name,
      name,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

  const rows: MonthRow[] = months.map((m) => {
    const entry = monthMap.get(m)
    const row: MonthRow = {
      month: m,
      label: format(new Date(m + '-01'), 'MMM yyyy'),
      total: 0,
    }
    let total = 0
    for (const s of series) {
      const amount = entry?.get(s.key) ?? 0
      row[s.key] = amount
      total += amount
    }
    row.total = total
    return row
  })

  return { rows, series }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MonthRow }>
  currency: Currency
  series: SeriesDef[]
  totalLabel: string
}

function CustomTooltip({ active, payload, currency, series, totalLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload

  const breakdown = series
    .map((s) => ({ ...s, amount: Number(data[s.key] ?? 0) }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 font-semibold">{data.label}</p>
      <p className="mb-2 text-sm">
        {totalLabel}: <span className="font-medium">{formatAmount(data.total, currency)}</span>
      </p>
      {breakdown.length > 0 && (
        <div className="space-y-0.5 border-t pt-2">
          {breakdown.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-muted-foreground">{s.name}:</span>
              <span className="ml-auto font-medium">
                {formatAmount(s.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function EarningsChart() {
  const [range, setRange] = useState<DateRange>('last12')
  const [mode, setMode] = useState<ChartViewMode>('split')
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? []
  const profile = useLiveQuery(() => profileService.get())
  const currency: Currency = profile?.defaultCurrency ?? 'GBP'

  const { rows, series } = useMemo(
    () => buildChartData(invoices, range, mode),
    [invoices, range, mode],
  )

  const totalLabel =
    mode === 'income' ? 'Income' : mode === 'expense' ? 'Expenses' : 'Total'

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Monthly Earnings
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as ChartViewMode)}>
            <SelectTrigger className="w-[160px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="split">Income vs expenses</SelectItem>
              <SelectItem value="combined">Combined</SelectItem>
              <SelectItem value="income">Income only</SelectItem>
              <SelectItem value="expense">Expenses only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-[150px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last6">Last 6 months</SelectItem>
              <SelectItem value="last12">Last 12 months</SelectItem>
              <SelectItem value="thisYear">This year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No paid invoices found for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={rows}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  `${CURRENCY_SYMBOLS[currency]}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                }
              />
              <Tooltip
                content={
                  <CustomTooltip
                    currency={currency}
                    series={series}
                    totalLabel={totalLabel}
                  />
                }
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.strokeDasharray}
                  dot={{ r: 3, fill: s.color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
