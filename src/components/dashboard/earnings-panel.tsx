import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, profileService } from '@/db'
import type { Currency } from '@/types'
import { VIEW_MODE_LABELS, type ChartViewMode } from '@/lib/invoice-amounts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EarningsChart } from './earnings-chart'
import { ClientBreakdownChart } from './client-breakdown-chart'
import { clientColors, clientTotals, monthlyRows, paidIn, RANGE_LABELS, type DateRange } from './earnings-data'

/** Both earnings views share one set of filters, so they always agree. */
export function EarningsPanel() {
  const [range, setRange] = useState<DateRange>('last12')
  const [mode, setMode] = useState<ChartViewMode>('combined')
  const invoices = useLiveQuery(() => db.invoices.toArray())
  const profile = useLiveQuery(() => profileService.get())
  const currency: Currency = profile?.defaultCurrency ?? 'GBP'

  const data = useMemo(() => {
    const paid = paidIn(invoices ?? [], currency)
    const colors = clientColors(paid)
    return {
      monthly: monthlyRows(paid, range, mode, colors),
      clients: clientTotals(paid, range, colors),
    }
  }, [invoices, currency, range, mode])

  if (!invoices) return <div className="h-80 skeleton rounded-xl" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
          <SelectTrigger size="sm" className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RANGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mode} onValueChange={(v) => setMode(v as ChartViewMode)}>
          <SelectTrigger size="sm" className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VIEW_MODE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto text-xs text-muted-foreground">Paid invoices in {currency}</p>
      </div>
      <EarningsChart rows={data.monthly.rows} series={data.monthly.series} currency={currency} mode={mode} />
      <ClientBreakdownChart clients={data.clients} currency={currency} mode={mode} />
    </div>
  )
}
