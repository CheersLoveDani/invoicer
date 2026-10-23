import type { Currency } from '@/types'
import { formatCurrency } from '@/lib/pdf-utils'
import type { ChartViewMode } from '@/lib/invoice-amounts'
import type { ClientTotal } from './earnings-data'

interface ClientBreakdownProps {
  clients: ClientTotal[]
  currency: Currency
  mode: ChartViewMode
}

/** Who the money came from, ranked, as plain bars that are easy to compare. */
export function ClientBreakdownChart({ clients, currency, mode }: ClientBreakdownProps) {
  const value = (c: ClientTotal) =>
    mode === 'income' ? c.income : mode === 'expense' ? c.expense : c.income + c.expense
  const rows = clients.filter((c) => value(c) > 0)
  const max = Math.max(1, ...rows.map(value))
  const grand = rows.reduce((sum, c) => sum + value(c), 0)

  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">By client</h3>
        {mode === 'split' && rows.length > 0 && (
          <ul className="flex gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-foreground/70" />
              Income
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-[repeating-linear-gradient(135deg,var(--foreground)_0_2px,transparent_2px_4px)] opacity-60" />
              Expenses
            </li>
          </ul>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Paid invoices in this period show up here.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c, i) => {
            const share = grand > 0 ? Math.round((value(c) / grand) * 100) : 0
            const width = (amount: number) => `${(amount / max) * 100}%`
            return (
              <li key={c.name} className="animate-rise" style={{ '--i': i } as React.CSSProperties}>
                <div className="mb-1 flex items-baseline gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground tabular">{share}%</span>
                  <span className="w-28 text-right font-medium tabular">
                    {formatCurrency(value(c), currency)}
                  </span>
                </div>
                <div
                  className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
                  title={
                    mode === 'split'
                      ? `Income ${formatCurrency(c.income, currency)}, expenses ${formatCurrency(c.expense, currency)}`
                      : undefined
                  }
                >
                  {mode === 'split' ? (
                    <>
                      <span
                        className="h-full rounded-l-full transition-[width] duration-700 ease-out-soft"
                        style={{ width: width(c.income), background: c.color }}
                      />
                      <span
                        className="h-full rounded-r-full opacity-60 transition-[width] duration-700 ease-out-soft"
                        style={{
                          width: width(c.expense),
                          background: `repeating-linear-gradient(135deg, ${c.color} 0 2px, transparent 2px 4px)`,
                        }}
                      />
                    </>
                  ) : (
                    <span
                      className="h-full rounded-full transition-[width] duration-700 ease-out-soft"
                      style={{ width: width(value(c)), background: c.color }}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
