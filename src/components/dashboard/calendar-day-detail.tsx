import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import type { Invoice, Schedule } from '@/types'
import { formatCurrency } from '@/lib/pdf-utils'
import { invoiceTotal } from '@/lib/invoice-amounts'

interface CalendarDayDetailProps {
  date: Date
  invoices: Invoice[]
  schedules: (Schedule & { clientName: string; templateName: string })[]
}

export function CalendarDayDetail({ date, invoices, schedules }: CalendarDayDetailProps) {
  const navigate = useNavigate()

  const hasEvents = invoices.length > 0 || schedules.length > 0

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">
        {format(date, 'EEEE d MMMM')}
      </h4>

      {!hasEvents && (
        <p className="text-sm text-muted-foreground">Nothing on this day.</p>
      )}

      {invoices.length > 0 && (
        <div className="space-y-1.5">
          {invoices.map((invoice) => {
            const total = invoiceTotal(invoice)
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
                <span className="shrink-0 text-xs font-medium tabular">
                  {formatCurrency(total, invoice.currency)}
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
              <span className="h-2 w-2 shrink-0 rounded-full bg-chart-4" />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {schedule.clientName}: {schedule.templateName}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  navigate(
                    `/invoices/new?template=${schedule.templateId}&client=${schedule.clientId}&schedule=${schedule.id}`
                  )
                }
              >
                Create invoice
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
