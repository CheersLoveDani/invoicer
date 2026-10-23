import { cn } from '@/lib/utils'
import { isOverdue } from '@/lib/invoice-amounts'
import type { InvoiceStatus } from '@/types'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  dueDate: Date
  className?: string
}

const STYLES = {
  draft: 'bg-muted text-muted-foreground ring-border',
  sent: 'bg-info/10 text-info ring-info/20',
  overdue: 'bg-warning/12 text-warning ring-warning/25',
  paid: 'bg-success/10 text-success ring-success/20',
} as const

const LABELS = { draft: 'Draft', sent: 'Sent', overdue: 'Overdue', paid: 'Paid' } as const

export function InvoiceStatusBadge({ status, dueDate, className }: InvoiceStatusBadgeProps) {
  const shown = isOverdue({ status, dueDate }) ? 'overdue' : status
  return (
    <span
      // Re-keyed on change so a status update visibly lands
      key={shown}
      className={cn(
        'inline-flex animate-pop items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STYLES[shown],
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full bg-current',
          shown === 'draft' && 'opacity-60',
          shown === 'overdue' && 'animate-pulse',
        )}
      />
      {LABELS[shown]}
    </span>
  )
}
