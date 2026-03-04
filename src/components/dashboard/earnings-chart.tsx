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

type DateRange = 'last6' | 'last12' | 'thisYear' | 'all'

interface MonthData {
  month: string // "YYYY-MM"
  label: string // "Jan", "Feb", etc.
  total: number
  rollingAvg: number | null
  clients: Record<string, number>
}

function invoiceTotal(invoice: Invoice): number {
  return [...invoice.lineItems, ...invoice.expenses].reduce(
    (sum, li) => sum + li.price,
    0
  )
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

function buildMonthlyData(
  invoices: Invoice[],
  range: DateRange
): MonthData[] {
  const filterStart = getFilteredStartDate(range)
  const now = new Date()

  // Filter to paid invoices within range
  const paid = invoices.filter((inv) => {
    if (inv.status !== 'paid' || !inv.paidAt) return false
    if (filterStart && !isAfter(inv.paidAt, filterStart) && inv.paidAt.getTime() !== filterStart.getTime()) return false
    return true
  })

  // Group by month
  const monthMap = new Map<string, { total: number; clients: Record<string, number> }>()

  for (const inv of paid) {
    const monthKey = format(inv.paidAt!, 'yyyy-MM')
    const entry = monthMap.get(monthKey) ?? { total: 0, clients: {} }
    const amount = invoiceTotal(inv)
    entry.total += amount
    const clientName = inv.to.name || 'Unknown'
    entry.clients[clientName] = (entry.clients[clientName] ?? 0) + amount
    monthMap.set(monthKey, entry)
  }

  // Generate all months in range
  const months: string[] = []
  if (range === 'all' && paid.length > 0) {
    // Find earliest paid date
    const earliest = paid.reduce(
      (min, inv) => (inv.paidAt! < min ? inv.paidAt! : min),
      paid[0].paidAt!
    )
    let cursor = startOfMonth(earliest)
    const end = startOfMonth(now)
    while (cursor <= end) {
      months.push(format(cursor, 'yyyy-MM'))
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  } else {
    const start = filterStart ?? startOfMonth(now)
    let cursor = new Date(start)
    const end = startOfMonth(now)
    while (cursor <= end) {
      months.push(format(cursor, 'yyyy-MM'))
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }

  // Build data array
  const data: MonthData[] = months.map((m) => {
    const entry = monthMap.get(m)
    return {
      month: m,
      label: format(new Date(m + '-01'), 'MMM yyyy'),
      total: entry?.total ?? 0,
      rollingAvg: null,
      clients: entry?.clients ?? {},
    }
  })

  // Calculate rolling 3-month average
  for (let i = 0; i < data.length; i++) {
    if (i >= 2) {
      const avg = (data[i].total + data[i - 1].total + data[i - 2].total) / 3
      data[i].rollingAvg = Math.round(avg * 100) / 100
    }
  }

  return data
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MonthData }>
  currency: Currency
}

function CustomTooltip({ active, payload, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 font-semibold">{data.label}</p>
      <p className="text-sm">
        Total: <span className="font-medium">{formatAmount(data.total, currency)}</span>
      </p>
      {data.rollingAvg !== null && (
        <p className="text-sm text-muted-foreground">
          3-month avg: {formatAmount(data.rollingAvg, currency)}
        </p>
      )}
      {Object.keys(data.clients).length > 0 && (
        <div className="mt-2 border-t pt-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            By Client
          </p>
          {Object.entries(data.clients)
            .sort(([, a], [, b]) => b - a)
            .map(([name, amount]) => (
              <p key={name} className="text-xs">
                {name}: {formatAmount(amount, currency)}
              </p>
            ))}
        </div>
      )}
    </div>
  )
}

export function EarningsChart() {
  const [range, setRange] = useState<DateRange>('last12')
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? []
  const profile = useLiveQuery(() => profileService.get())
  const currency: Currency = profile?.defaultCurrency ?? 'GBP'

  const data = useMemo(
    () => buildMonthlyData(invoices, range),
    [invoices, range]
  )

  const handleClick = (point: MonthData) => {
    // For now, console.log the month for future filtering
    console.log(`Navigate to /invoices?month=${point.month}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Monthly Earnings
        </CardTitle>
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
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No paid invoices found for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              onClick={(nextState) => {
                const idx = nextState?.activeTooltipIndex
                if (typeof idx === 'number' && data[idx]) {
                  handleClick(data[idx])
                }
              }}
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
                content={<CustomTooltip currency={currency} />}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                name="Earnings"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="rollingAvg"
                name="3-Month Avg"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
