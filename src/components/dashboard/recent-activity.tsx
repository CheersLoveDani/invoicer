import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { invoiceService } from '@/db'
import { formatCurrency } from '@/lib/pdf-utils'
import { invoiceTotal } from '@/lib/invoice-amounts'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { Button } from '@/components/ui/button'

export function RecentActivity() {
  const navigate = useNavigate()
  const invoices = useLiveQuery(() => invoiceService.getRecent(8))

  if (invoices === undefined) return <div className="h-64 skeleton rounded-xl" />

  return (
    <section className="rounded-xl border bg-card p-3 shadow-card">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <h3 className="text-sm font-semibold">Recent invoices</h3>
        <Button variant="link" size="xs" asChild className="text-muted-foreground">
          <Link to="/invoices">See all</Link>
        </Button>
      </div>
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Invoices you create show up here.</p>
          <Button size="sm" asChild>
            <Link to="/invoices/new">Create an invoice</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {invoices.map((invoice, i) => (
            <li key={invoice.id}>
              <button
                type="button"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className="flex w-full animate-rise cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                style={{ '--i': i } as React.CSSProperties}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invoice.to.name || 'No client'}</p>
                  <p className="text-xs text-muted-foreground tabular">
                    {invoice.invoiceNumber || 'No number'}, {format(new Date(invoice.date), 'd MMM')}
                  </p>
                </div>
                <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                <span className="w-24 shrink-0 text-right text-sm font-medium tabular">
                  {formatCurrency(invoiceTotal(invoice), invoice.currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
