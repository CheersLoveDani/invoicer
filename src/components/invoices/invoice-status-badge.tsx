import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/types'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  dueDate: Date
}

export function InvoiceStatusBadge({ status, dueDate }: InvoiceStatusBadgeProps) {
  if (status === 'draft') {
    return (
      <Badge variant="secondary">
        Draft
      </Badge>
    )
  }

  if (status === 'sent') {
    const isOverdue = new Date(dueDate) < new Date()
    if (isOverdue) {
      return (
        <Badge variant="destructive">
          Overdue
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
        Sent
      </Badge>
    )
  }

  if (status === 'paid') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        Paid
      </Badge>
    )
  }

  return null
}
