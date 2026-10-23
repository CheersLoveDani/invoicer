import { useLiveQuery } from 'dexie-react-hooks'
import { invoiceService, profileService } from '@/db'
import { formatCurrency } from '@/lib/pdf-utils'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { cn } from '@/lib/utils'

const plural = (n: number) => `${n} invoice${n !== 1 ? 's' : ''}`

export function StatsCards() {
  const data = useLiveQuery(async () => {
    const { defaultCurrency } = await profileService.get()
    return { currency: defaultCurrency, stats: await invoiceService.getStats(defaultCurrency) }
  })

  if (!data) {
    return <div className="h-40 skeleton rounded-2xl" />
  }

  const { currency, stats } = data
  const money = (n: number) => formatCurrency(n, currency)

  const secondary = [
    {
      label: 'Overdue',
      value: stats.overdue,
      note: stats.overdueCount ? plural(stats.overdueCount) : 'Nothing late',
      tone: stats.overdueCount ? 'text-warning' : '',
    },
    { label: 'Paid this month', value: stats.paidThisMonth, note: null, tone: '' },
    { label: 'Earned this year', value: stats.earnedThisYear, note: null, tone: '' },
  ]

  return (
    <section className="grid overflow-hidden rounded-2xl border bg-card shadow-card lg:grid-cols-[1.35fr_repeat(3,1fr)]">
      {/* The figure that matters most: what clients still owe */}
      <div className="relative overflow-hidden bg-primary p-6 text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full border-[28px] border-white/[0.06]"
        />
        <p className="text-sm font-medium text-primary-foreground/75">Waiting to be paid</p>
        <AnimatedNumber
          value={stats.outstanding}
          format={money}
          className="mt-2 block text-4xl leading-none font-semibold tracking-[-0.03em] tabular md:text-[2.75rem]"
        />
        <p className="mt-3 text-sm text-primary-foreground/75">
          {stats.outstandingCount ? `Across ${plural(stats.outstandingCount)}` : 'Every sent invoice is paid'}
        </p>
      </div>
      {secondary.map((item) => (
        <div key={item.label} className="flex flex-col justify-between gap-3 border-t p-5 lg:border-t-0 lg:border-l">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <div>
            <AnimatedNumber
              value={item.value}
              format={money}
              className={cn('block text-2xl font-semibold tracking-[-0.02em] tabular', item.tone)}
            />
            {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
          </div>
        </div>
      ))}
      {stats.otherCurrencyCount > 0 && (
        <p className="border-t px-5 py-2 text-xs text-muted-foreground lg:col-span-4">
          Totals are in {currency}. {plural(stats.otherCurrencyCount)} in other currencies are left out.
        </p>
      )}
    </section>
  )
}
