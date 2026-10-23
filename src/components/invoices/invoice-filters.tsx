import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { db } from '@/db'
import type { Currency } from '@/types'
import { CURRENCY_SYMBOLS } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { isOverdue } from '@/lib/invoice-amounts'

export interface FilterState {
  search: string
  status: ('draft' | 'sent' | 'paid' | 'overdue')[]
  clientName: string
  dateRange: { from?: Date; to?: Date }
  currency: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const defaultFilters: FilterState = {
  search: '',
  status: [],
  clientName: '',
  dateRange: {},
  currency: '',
}

interface InvoiceFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const STATUS_OPTIONS = ['draft', 'sent', 'paid', 'overdue'] as const

export function InvoiceFilters({ filters, onChange }: InvoiceFiltersProps) {
  const invoices = useLiveQuery(() => db.invoices.toArray()) ?? []

  const clientNames = Array.from(
    new Set(invoices.map((inv) => inv.to.name).filter(Boolean))
  ).sort()

  const currencies = Array.from(
    new Set(invoices.map((inv) => inv.currency).filter(Boolean))
  ).sort()

  const statusCounts = { draft: 0, sent: 0, paid: 0, overdue: 0 }
  for (const inv of invoices) statusCounts[isOverdue(inv) ? 'overdue' : inv.status]++

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status.length > 0 ||
    filters.clientName !== '' ||
    filters.dateRange.from !== undefined ||
    filters.dateRange.to !== undefined ||
    filters.currency !== ''

  function toggleStatus(s: (typeof STATUS_OPTIONS)[number]) {
    const current = filters.status
    const next = current.includes(s)
      ? current.filter((x) => x !== s)
      : [...current, s]
    onChange({ ...filters, status: next })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Number, client or title"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-8 w-[220px] pl-8"
        />
      </div>

      {/* Status toggles */}
      <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-xs" role="group" aria-label="Filter by status">
        {STATUS_OPTIONS.map((s) => {
          const isActive = filters.status.includes(s)
          return (
            <button
              key={s}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleStatus(s)}
              className={cn(
                'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium capitalize transition-[background-color,color] duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {s}
              <span
                className={cn(
                  'text-xs tabular',
                  isActive ? 'text-primary-foreground/75' : 'text-muted-foreground/70',
                )}
              >
                {statusCounts[s]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Client name */}
      {clientNames.length > 0 && (
        <Select
          value={filters.clientName}
          onValueChange={(value) =>
            onChange({ ...filters, clientName: value === '__all__' ? '' : value })
          }
        >
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All clients</SelectItem>
            {clientNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date from */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-[130px] justify-start text-left font-normal',
              !filters.dateRange.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {filters.dateRange.from
              ? format(filters.dateRange.from, 'd MMM yyyy')
              : 'From'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateRange.from}
            onSelect={(date) =>
              onChange({
                ...filters,
                dateRange: { ...filters.dateRange, from: date ?? undefined },
              })
            }
          />
        </PopoverContent>
      </Popover>

      {/* Date to */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-[130px] justify-start text-left font-normal',
              !filters.dateRange.to && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {filters.dateRange.to
              ? format(filters.dateRange.to, 'd MMM yyyy')
              : 'To'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateRange.to}
            onSelect={(date) =>
              onChange({
                ...filters,
                dateRange: { ...filters.dateRange, to: date ?? undefined },
              })
            }
          />
        </PopoverContent>
      </Popover>

      {/* Currency */}
      {currencies.length > 0 && (
        <Select
          value={filters.currency}
          onValueChange={(value) =>
            onChange({ ...filters, currency: value === '__all__' ? '' : value })
          }
        >
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All currencies</SelectItem>
            {currencies.map((c) => (
              <SelectItem key={c} value={c}>
                {CURRENCY_SYMBOLS[c as Currency] ?? c} {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(defaultFilters)}
        >
          <X className="mr-1 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
