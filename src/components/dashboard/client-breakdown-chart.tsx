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

type DateRange = 'last6' | 'last12' | 'thisYear' | 'all'

const CHART_COLORS = [
  'hsl(221, 83%, 53%)',  // blue
  'hsl(142, 71%, 45%)',  // green
  'hsl(38, 92%, 50%)',   // amber
  'hsl(0, 84%, 60%)',    // red
  'hsl(262, 83%, 58%)',  // purple
  'hsl(199, 89%, 48%)',  // cyan
  'hsl(25, 95%, 53%)',   // orange
  'hsl(330, 81%, 60%)',  // pink
  'hsl(173, 80%, 40%)',  // teal
  'hsl(47, 96%, 53%)',   // yellow
]

interface ClientSegment {
  name: string
  amount: number
  percentage: number
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

function buildClientData(
  invoices: Invoice[],
  range: DateRange
): { segments: ClientSegment[]; total: number } {
  const filterStart = getFilteredStartDate(range)

  const paid = invoices.filter((inv) => {
    if (inv.status !== 'paid' || !inv.paidAt) return false
    if (
      filterStart &&
      !isAfter(inv.paidAt, filterStart) &&
      inv.paidAt.getTime() !== filterStart.getTime()
    )
      return false
    return true
  })

  const clientMap = new Map<string, number>()
  let total = 0

  for (const inv of paid) {
    const amount = invoiceTotal(inv)
    const clientName = inv.to.name || 'Unknown'
    clientMap.set(clientName, (clientMap.get(clientName) ?? 0) + amount)
    total += amount
  }

  const segments: ClientSegment[] = Array.from(clientMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  return { segments, total }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ClientSegment }>
  currency: Currency
}

function CustomTooltip({ active, payload, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-semibold">{data.name}</p>
      <p className="text-sm">
        Amount: <span className="font-medium">{formatAmount(data.amount, currency)}</span>
      </p>
      <p className="text-sm text-muted-foreground">{data.percentage}% of total</p>
    </div>
  )
}

interface CenterLabelProps {
  cx: number
  cy: number
  total: number
  currency: Currency
}

function CenterLabel({ cx, cy, total, currency }: CenterLabelProps) {
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
        Total
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
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? []
  const profile = useLiveQuery(() => profileService.get())
  const currency: Currency = profile?.defaultCurrency ?? 'GBP'

  const { segments, total } = useMemo(
    () => buildClientData(invoices, range),
    [invoices, range]
  )

  const handleClick = useCallback((_: unknown, index: number) => {
    const segment = segments[index]
    if (segment) {
      console.log(`Navigate to /invoices?client=${encodeURIComponent(segment.name)}`)
    }
  }, [segments])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">
          Client Breakdown
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
        {segments.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No paid invoices found for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={segments}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                nameKey="name"
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
                label={false}
              >
                {segments.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
                <CenterLabel
                  cx={0}
                  cy={0}
                  total={total}
                  currency={currency}
                />
              </Pie>
              <Tooltip
                content={<CustomTooltip currency={currency} />}
              />
              <Legend content={renderCustomLegend} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
