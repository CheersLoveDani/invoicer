import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { invoiceService } from '@/db'
import { CURRENCY_SYMBOLS, type Currency } from '@/types'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'

function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getInvoiceTotal(invoice: { lineItems: { price: number }[]; expenses: { price: number }[] }): number {
  const lineItemsTotal = invoice.lineItems.reduce((sum, item) => sum + item.price, 0)
  const expensesTotal = invoice.expenses.reduce((sum, item) => sum + item.price, 0)
  return lineItemsTotal + expensesTotal
}

export function RecentActivity() {
  const navigate = useNavigate()
  const invoices = useLiveQuery(() => invoiceService.getRecent(20)) ?? []

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm font-medium text-muted-foreground">
          No invoices yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          Create your first invoice to see activity here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {invoices.map((invoice) => {
        const total = getInvoiceTotal(invoice)
        return (
          <div
            key={invoice.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/60"
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/invoices/${invoice.id}`)
              }
            }}
          >
            <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
            <span className="min-w-0 shrink-0 text-sm font-medium">
              {invoice.invoiceNumber}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {invoice.to.name}
            </span>
            <span className="shrink-0 text-sm font-mono">
              {formatAmount(total, invoice.currency)}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {format(new Date(invoice.date), 'dd MMM yyyy')}
            </span>
          </div>
        )
      })}
    </div>
  )
}
