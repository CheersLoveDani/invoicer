import { useMemo, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { subMonths, startOfMonth, isAfter, startOfYear } from 'date-fns'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

interface Segment {
  name: string
  amount: number
  percentage: number
  color: string
  category?: 'income' | 'expense'
}

interface SplitData {
  income: Segment[]
  expense: Segment[]
  clients: { name: string; color: string }[]
  total: number
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

function filterPaid(invoices: Invoice[], range: DateRange): Invoice[] {
  const filterStart = getFilteredStartDate(range)
  return invoices.filter((inv) => {
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
}

function buildSinglePie(
  invoices: Invoice[],
  range: DateRange,
  mode: Exclude<ChartViewMode, 'split'>,
): { segments: Segment[]; total: number } {
  const paid = filterPaid(invoices, range)
  const clientMap = new Map<string, number>()
  let total = 0

  for (const inv of paid) {
    const amount = amountForMode(inv, mode)
    if (amount === 0) continue
    const clientName = inv.to.name || 'Unknown'
    clientMap.set(clientName, (clientMap.get(clientName) ?? 0) + amount)
    total += amount
  }

  const segments: Segment[] = Array.from(clientMap.entries())
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount], index) => ({
      name,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

  return { segments, total }
}

function buildSplit(invoices: Invoice[], range: DateRange): SplitData {
  const paid = filterPaid(invoices, range)
  const incomeMap = new Map<string, number>()
  const expenseMap = new Map<string, number>()
  const clientTotals = new Map<string, number>()
  let incomeTotal = 0
  let expenseTotal = 0

  for (const inv of paid) {
    const inc = incomeAmount(inv)
    const exp = expenseAmount(inv)
    if (inc === 0 && exp === 0) continue
    const clientName = inv.to.name || 'Unknown'
    if (inc > 0) {
      incomeMap.set(clientName, (incomeMap.get(clientName) ?? 0) + inc)
      incomeTotal += inc
    }
    if (exp > 0) {
      expenseMap.set(clientName, (expenseMap.get(clientName) ?? 0) + exp)
      expenseTotal += exp
    }
    clientTotals.set(clientName, (clientTotals.get(clientName) ?? 0) + inc + exp)
  }

  const clients = Array.from(clientTotals.entries())
    .filter(([, total]) => total > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name], index) => ({
      name,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))

  const colorByClient = new Map(clients.map((c) => [c.name, c.color]))
  const pct = (n: number, denom: number) =>
    denom > 0 ? Math.round((n / denom) * 1000) / 10 : 0

  const income: Segment[] = clients
    .map((c) => ({
      name: c.name,
      amount: incomeMap.get(c.name) ?? 0,
      percentage: pct(incomeMap.get(c.name) ?? 0, incomeTotal),
      color: colorByClient.get(c.name) ?? CHART_COLORS[0],
      category: 'income' as const,
    }))
    .filter((s) => s.amount > 0)

  const expense: Segment[] = clients
    .map((c) => ({
      name: c.name,
      amount: expenseMap.get(c.name) ?? 0,
      percentage: pct(expenseMap.get(c.name) ?? 0, expenseTotal),
      color: colorByClient.get(c.name) ?? CHART_COLORS[0],
      category: 'expense' as const,
    }))
    .filter((s) => s.amount > 0)

  return { income, expense, clients, total: incomeTotal + expenseTotal }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: Segment }>
  currency: Currency
}

function CustomTooltip({ active, payload, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const categoryLabel =
    data.category === 'income'
      ? 'Income'
      : data.category === 'expense'
        ? 'Expenses'
        : null

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold">{data.name}</p>
      {categoryLabel && (
        <p className="text-xs text-muted-foreground">{categoryLabel}</p>
      )}
      <p className="text-sm">
        Amount: <span className="font-medium">{formatAmount(data.amount, currency)}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        {data.percentage}% of {categoryLabel?.toLowerCase() ?? 'total'}
      </p>
    </div>
  )
}

interface CenterLabelProps {
  cx: number
  cy: number
  total: number
  currency: Currency
  label: string
}

function CenterLabel({ cx, cy, total, currency, label }: CenterLabelProps) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  const formatted =
    total >= 1000
      ? `${symbol}${(total / 1000).toFixed(1)}k`
      : `${symbol}${total.toFixed(0)}`

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-foreground"
    >
      <tspan x={cx} dy="-0.5em" fontSize="12" className="fill-muted-foreground">
        {label}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize="16" fontWeight="bold">
        {formatted}
      </tspan>
    </text>
  )
}

function renderCustomLegend(props: { payload?: ReadonlyArray<{ value?: string; color?: string }> }) {
  const { payload } = props
  if (!payload) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ClientBreakdownChart() {
  const [range, setRange] = useState<DateRange>('last12')
  const [mode, setMode] = useState<ChartViewMode>('split')
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? []
  const profile = useLiveQuery(() => profileService.get())
  const currency: Currency = profile?.defaultCurrency ?? 'GBP'

  const splitData = useMemo(
    () => (mode === 'split' ? buildSplit(invoices, range) : null),
    [invoices, range, mode],
  )
  const singleData = useMemo(
    () =>
      mode !== 'split'
        ? buildSinglePie(invoices, range, mode)
        : null,
    [invoices, range, mode],
  )

  const handleSingleClick = useCallback(
    (_: unknown, index: number) => {
      const segment = singleData?.segments[index]
      if (segment) {
        console.log(`Navigate to /invoices?client=${encodeURIComponent(segment.name)}`)
      }
    },
    [singleData],
  )

  const centerLabel =
    mode === 'income' ? 'Income' : mode === 'expense' ? 'Expenses' : 'Total'

  const isEmpty =
    mode === 'split'
      ? !splitData || (splitData.income.length === 0 && splitData.expense.length === 0)
      : !singleData || singleData.segments.length === 0

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          {mode === 'split' ? 'Income vs Expenses' : 'Client Breakdown'}
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
        {isEmpty ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No paid invoices found for this period.
          </div>
        ) : mode === 'split' && splitData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              {/* Outer ring — income (solid) */}
              <Pie
                data={splitData.income}
                cx="50%"
                cy="45%"
                innerRadius={82}
                outerRadius={110}
                paddingAngle={2}
                dataKey="amount"
                nameKey="name"
                label={false}
                isAnimationActive={false}
              >
                {splitData.income.map((segment, index) => (
                  <Cell key={`income-${index}`} fill={segment.color} />
                ))}
              </Pie>
              {/* Inner ring — expenses (slightly transparent for visual distinction) */}
              <Pie
                data={splitData.expense}
                cx="50%"
                cy="45%"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={2}
                dataKey="amount"
                nameKey="name"
                label={false}
                isAnimationActive={false}
              >
                {splitData.expense.map((segment, index) => (
                  <Cell
                    key={`expense-${index}`}
                    fill={segment.color}
                    fillOpacity={0.55}
                    stroke={segment.color}
                  />
                ))}
                <CenterLabel
                  cx={0}
                  cy={0}
                  total={splitData.total}
                  currency={currency}
                  label="Total"
                />
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>
        ) : singleData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={singleData.segments}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                nameKey="name"
                onClick={handleSingleClick}
                style={{ cursor: 'pointer' }}
                label={false}
              >
                {singleData.segments.map((segment, index) => (
                  <Cell key={`cell-${index}`} fill={segment.color} />
                ))}
                <CenterLabel
                  cx={0}
                  cy={0}
                  total={singleData.total}
                  currency={currency}
                  label={centerLabel}
                />
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend content={renderCustomLegend} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
        {mode === 'split' && splitData && !isEmpty && (
          <>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {splitData.clients.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-muted-foreground">{c.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-foreground/70" />
                Outer = income
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-foreground/30" />
                Inner = expenses
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
