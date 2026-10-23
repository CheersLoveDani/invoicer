import { useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { Copy, FilePlus2, LayoutTemplate, Search } from 'lucide-react'
import { db, profileService } from '@/db'
import { formatCurrency } from '@/lib/pdf-utils'
import { invoiceTotal } from '@/lib/invoice-amounts'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'

// Any "New invoice" button opens the same chooser
let open = false
const listeners = new Set<() => void>()
function setOpen(next: boolean) {
  open = next
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// eslint-disable-next-line react-refresh/only-export-components
export function openNewInvoice() {
  setOpen(true)
}

type Source = 'invoice' | 'template'

const optionClass =
  'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none'

export function NewInvoiceDialog() {
  const isOpen = useSyncExternalStore(subscribe, () => open)
  const navigate = useNavigate()
  const [source, setSource] = useState<Source>('invoice')
  const [query, setQuery] = useState('')

  const invoices = useLiveQuery(() => db.invoices.orderBy('date').reverse().toArray(), [], [])
  const templates = useLiveQuery(() => db.templates.toArray(), [], [])
  const currency = useLiveQuery(async () => (await profileService.get()).defaultCurrency, [], 'GBP')

  const shownInvoices = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? invoices.filter(
          (inv) =>
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.to.name.toLowerCase().includes(q) ||
            inv.title.toLowerCase().includes(q),
        )
      : invoices
    return list.slice(0, 30)
  }, [invoices, query])

  const shownTemplates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? templates.filter((t) => t.name.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)) : templates
  }, [templates, query])

  const go = (path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {/* Grows with its rows up to a cap; long names truncate rather than widen it */}
      <DialogContent className="w-fit min-w-[min(34rem,calc(100%-2rem))] grid-cols-[minmax(0,1fr)] gap-5 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription className="max-w-lg">
            Start from nothing, or copy one you have already made. Copies get the client's next number and today's date.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => go('/invoices/new')}
          className="group flex cursor-pointer items-center gap-4 rounded-xl border bg-card p-4 text-left transition-[border-color,box-shadow,transform] duration-150 hover:border-primary hover:shadow-lift active:scale-[0.99]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FilePlus2 className="size-5" />
          </span>
          <span>
            <span className="block font-semibold">Blank invoice</span>
            <span className="block text-sm text-muted-foreground">Your details and payment info, nothing else.</span>
          </span>
        </button>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Copy from">
              {(
                [
                  ['invoice', 'An existing invoice', Copy],
                  ['template', 'A template', LayoutTemplate],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={source === value}
                  onClick={() => setSource(value)}
                  className={cn(
                    'flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-[background-color,color,box-shadow]',
                    source === value ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={source === 'invoice' ? 'Number or client' : 'Template name'}
                className="h-8 w-48 pl-8 text-sm"
              />
            </div>
          </div>

          <div key={source} className="max-h-[min(24rem,calc(100dvh-22rem))] min-h-32 animate-page overflow-y-auto rounded-xl border p-1">
            {source === 'invoice' ? (
              shownInvoices.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {invoices.length ? 'No invoice matches.' : 'No invoices yet. Start with a blank one.'}
                </p>
              ) : (
                shownInvoices.map((inv) => (
                  <button key={inv.id} type="button" className={optionClass} onClick={() => go(`/invoices/new?duplicate=${inv.id}`)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{inv.to.name || 'No client'}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {inv.invoiceNumber || 'No number'}, {format(new Date(inv.date), 'd MMM yyyy')}
                        {inv.title && inv.title !== 'Invoice' ? `, ${inv.title}` : ''}
                      </span>
                    </span>
                    <InvoiceStatusBadge status={inv.status} dueDate={inv.dueDate} />
                    <span className="w-24 shrink-0 text-right text-sm font-medium tabular">
                      {formatCurrency(invoiceTotal(inv), inv.currency)}
                    </span>
                  </button>
                ))
              )
            ) : shownTemplates.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {templates.length ? 'No template matches.' : 'No templates yet. Save one from any invoice.'}
              </p>
            ) : (
              shownTemplates.map((t) => (
                <button key={t.id} type="button" className={optionClass} onClick={() => go(`/invoices/new?template=${t.id}`)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[t.title, `${t.lineItems.length + t.expenses.length} items`].filter(Boolean).join(', ')}
                    </span>
                  </span>
                  <span className="text-sm font-medium tabular">
                    {formatCurrency(invoiceTotal(t), currency)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
