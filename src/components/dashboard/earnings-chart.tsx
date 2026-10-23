import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Currency } from '@/types'
import { CURRENCY_SYMBOLS } from '@/types'
import { formatCurrency } from '@/lib/pdf-utils'
import type { ChartViewMode } from '@/lib/invoice-amounts'
import type { MonthRow, Series } from './earnings-data'

interface EarningsChartProps {
  rows: MonthRow[]
  series: Series[]
  currency: Currency
  mode: ChartViewMode
}

function compact(value: number, currency: Currency) {
  const symbol = CURRENCY_SYMBOLS[currency]
  if (Math.abs(value) >= 1000) return `${symbol}${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return `${symbol}${value}`
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: MonthRow }>
  currency: Currency
  series: Series[]
  totalLabel: string
}

function ChartTooltip({ active, payload, currency, series, totalLabel }: TooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const parts = series.map((s) => ({ ...s, amount: Number(row[s.key] ?? 0) })).filter((s) => s.amount > 0)

  return (
    <div className="min-w-44 rounded-xl border bg-popover px-3 py-2.5 shadow-lift">
      <p className="text-xs text-muted-foreground">{row.label}</p>
      <p className="text-sm font-semibold tabular">
        {totalLabel} {formatCurrency(row.total, currency)}
      </p>
      {parts.length > 1 && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {parts.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="size-2 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="truncate text-muted-foreground">{s.name}</span>
              <span className="ml-auto font-medium tabular">{formatCurrency(s.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Money received per month, stacked by client (or income against expenses). */
export function EarningsChart({ rows, series, currency, mode }: EarningsChartProps) {
  const totalLabel = mode === 'income' ? 'Income' : mode === 'expense' ? 'Expenses' : 'Total'
  const hasData = rows.some((r) => r.total > 0)

  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Paid each month</h3>
        {series.length > 1 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Paid invoices in this period show up here.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickFormatter={(v: number) => compact(v, currency)}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
              content={<ChartTooltip currency={currency} series={series} totalLabel={totalLabel} />}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId={mode === 'split' ? undefined : 'total'}
                fill={s.color}
                stroke="var(--card)"
                strokeWidth={mode === 'split' ? 0 : 1}
                // Rounded only where the bar ends, not between stacked segments
                radius={mode === 'split' || i === series.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={mode === 'split' ? 18 : 36}
                animationDuration={600}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
