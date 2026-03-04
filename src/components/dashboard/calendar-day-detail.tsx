import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { CURRENCY_SYMBOLS, type Invoice, type Schedule, type Currency } from '@/types'

interface CalendarDayDetailProps {
  date: Date
  invoices: Invoice[]
  schedules: (Schedule & { clientName: string; templateName: string })[]
}

function getInvoiceTotal(invoice: Invoice): number {
  const lineItemsTotal = invoice.lineItems.reduce((sum, item) => sum + item.price, 0)
  const expensesTotal = invoice.expenses.reduce((sum, item) => sum + item.price, 0)
  return lineItemsTotal + expensesTotal
}

function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CalendarDayDetail({ date, invoices, schedules }: CalendarDayDetailProps) {
  const navigate = useNavigate()

  const hasEvents = invoices.length > 0 || schedules.length > 0

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">
        {format(date, 'MMMM d, yyyy')}
      </h4>

      {!hasEvents && (
        <p className="text-sm text-muted-foreground">No events on this day</p>
      )}

      {invoices.length > 0 && (
        <div className="space-y-1.5">
          {invoices.map((invoice) => {
            const total = getInvoiceTotal(invoice)
            return (
              <div
                key={invoice.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
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
                <span className="shrink-0 text-xs font-medium">{invoice.invoiceNumber}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {invoice.to.name}
                </span>
                <span className="shrink-0 text-xs font-mono">
                  {formatAmount(total, invoice.currency)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {schedules.length > 0 && (
        <div className="space-y-1.5">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                Scheduled: {schedule.clientName} &ndash; {schedule.templateName}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  navigate(
                    `/invoices/new?template=${schedule.templateId}&client=${schedule.clientId}`
                  )
                }
              >
                Create Now
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
