import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Copy,
  CheckCircle2,
  Mail,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Invoice } from '@/types'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pdf-utils'
import { invoiceTotal, isOverdue } from '@/lib/invoice-amounts'
import { invoiceService } from '@/db'
import { SendInvoiceDialog } from '@/components/invoice/send-invoice-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InvoiceStatusBadge } from './invoice-status-badge'

function statusRank(invoice: Invoice): number {
  if (isOverdue(invoice)) return 0
  return { draft: 1, sent: 2, paid: 3 }[invoice.status]
}

type SortField = 'invoiceNumber' | 'clientName' | 'date' | 'dueDate' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'

interface InvoiceTableProps {
  invoices: Invoice[]
  /** Selection lives with the page so bulk actions and the table agree. */
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  /** True when filters hide every invoice, rather than there being none. */
  filtered?: boolean
}

const getInvoiceTotal = invoiceTotal

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDirection }) {
  if (sortField !== field) return <ArrowUpDown className="size-3 opacity-0 transition-opacity group-hover/sort:opacity-60" />
  if (sortDir === 'asc') return <ArrowUp className="size-3 text-foreground" />
  return <ArrowDown className="size-3 text-foreground" />
}

export function InvoiceTable({ invoices, selectedIds, onSelectionChange, filtered }: InvoiceTableProps) {
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reminderEmail, setReminderEmail] = useState<{ to: string; subject: string; body: string } | null>(null)

  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'invoiceNumber':
          cmp = a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true })
          break
        case 'clientName':
          cmp = a.to.name.localeCompare(b.to.name)
          break
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'dueDate':
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          break
        case 'amount':
          cmp = getInvoiceTotal(a) - getInvoiceTotal(b)
          break
        case 'status':
          cmp = statusRank(a) - statusRank(b)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [invoices, sortField, sortDir])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  function toggleSelectAll() {
    onSelectionChange(
      selectedIds.size === invoices.length ? new Set() : new Set(invoices.map((inv) => inv.id)),
    )
  }

  async function handleMarkPaid(id: string) {
    try {
      await invoiceService.markPaid(id)
      toast.success('Invoice marked as paid')
    } catch {
      toast.error('Failed to mark invoice as paid')
    }
  }

  async function handleMarkSent(id: string) {
    try {
      await invoiceService.markSent(id)
      toast.success('Invoice marked as sent')
    } catch {
      toast.error('Failed to mark invoice as sent')
    }
  }

  async function handleDelete(id: string) {
    try {
      await invoiceService.delete(id)
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds)
        next.delete(id)
        onSelectionChange(next)
      }
      toast.success('Invoice deleted')
    } catch {
      toast.error('Failed to delete invoice')
    }
    setDeleteId(null)
  }

  function handleSendReminder(invoice: Invoice) {
    setReminderEmail({
      to: invoice.to.email,
      subject: `Reminder: Invoice ${invoice.invoiceNumber}`,
      body: `Dear ${invoice.to.name},\n\nThis is a friendly reminder that invoice ${invoice.invoiceNumber} for ${formatCurrency(invoiceTotal(invoice), invoice.currency)}, dated ${format(new Date(invoice.date), 'd MMMM yyyy')}, ${isOverdue(invoice) ? 'was due on' : 'is due on'} ${format(new Date(invoice.dueDate), 'd MMMM yyyy')}.\n\nPlease let me know if you have any questions.\n\nBest regards,\n${invoice.from.name}`,
    })
  }


  const allSelected = invoices.length > 0 && selectedIds.size === invoices.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < invoices.length
  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all invoices"
                />
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="xs" className="group/sort -ml-2 font-medium text-muted-foreground hover:text-foreground" onClick={() => handleSort('invoiceNumber')}>
                  Invoice # <SortIcon field="invoiceNumber" sortField={sortField} sortDir={sortDir} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="xs" className="group/sort -ml-2 font-medium text-muted-foreground hover:text-foreground" onClick={() => handleSort('clientName')}>
                  Client <SortIcon field="clientName" sortField={sortField} sortDir={sortDir} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="xs" className="group/sort -ml-2 font-medium text-muted-foreground hover:text-foreground" onClick={() => handleSort('date')}>
                  Date <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <Button variant="ghost" size="xs" className="group/sort -ml-2 font-medium text-muted-foreground hover:text-foreground" onClick={() => handleSort('dueDate')}>
                  Due <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="xs" className="group/sort -mr-2 font-medium text-muted-foreground hover:text-foreground" onClick={() => handleSort('amount')}>
                  Amount <SortIcon field="amount" sortField={sortField} sortDir={sortDir} />
                </Button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <Button variant="ghost" size="xs" className="group/sort -ml-2 font-medium text-muted-foreground hover:text-foreground" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                </Button>
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  {filtered ? (
                    <p className="text-muted-foreground">No invoices match these filters.</p>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-muted-foreground">No invoices yet.</p>
                      <Button size="sm" asChild>
                        <Link to="/invoices/new">Create your first invoice</Link>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sortedInvoices.map((invoice, index) => {
                const overdue = isOverdue(invoice)
                const total = getInvoiceTotal(invoice)
                return (
                  <TableRow
                    key={invoice.id}
                    data-state={selectedIds.has(invoice.id) ? 'selected' : undefined}
                    className="group animate-rise"
                    style={{ '--i': Math.min(index, 12) } as React.CSSProperties}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                        aria-label={`Select invoice ${invoice.invoiceNumber}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="font-medium tabular underline-offset-4 hover:text-primary hover:underline"
                      >
                        {invoice.invoiceNumber || 'No number'}
                      </Link>
                      {invoice.title && invoice.title !== 'Invoice' && (
                        <p className="max-w-56 truncate text-xs text-muted-foreground">{invoice.title}</p>
                      )}
                    </TableCell>
                    <TableCell>{invoice.to.name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-muted-foreground tabular">{format(new Date(invoice.date), 'd MMM yyyy')}</TableCell>
                    <TableCell className={cn('hidden tabular lg:table-cell', overdue ? 'font-medium text-warning' : 'text-muted-foreground')}>
                      {format(new Date(invoice.dueDate), 'd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular">
                      {formatCurrency(total, invoice.currency)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground opacity-60 group-hover:opacity-100 data-[state=open]:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                            <Eye className="h-4 w-4" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/invoices/new?duplicate=${invoice.id}`)}>
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleMarkSent(invoice.id)}>
                              <Send className="h-4 w-4" />
                              Mark as sent
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => handleMarkPaid(invoice.id)}>
                              <CheckCircle2 className="h-4 w-4" />
                              Mark as paid
                            </DropdownMenuItem>
                          )}
                          {invoice.status === 'sent' && (
                            <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>
                              <Mail className="h-4 w-4" />
                              Send a reminder
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this invoice?</DialogTitle>
            <DialogDescription>
              It is removed for good. Its number becomes free again unless it was already sent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send reminder dialog */}
      {reminderEmail && (
        <SendInvoiceDialog
          open={!!reminderEmail}
          onOpenChange={(open) => { if (!open) setReminderEmail(null) }}
          recipientEmail={reminderEmail.to}
          subject={reminderEmail.subject}
          body={reminderEmail.body}
          title="Send a reminder"
          description="Open the reminder in your mail app, or copy the parts you need."
        />
      )}
    </>
  )
}
