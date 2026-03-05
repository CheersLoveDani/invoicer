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
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Invoice, Currency } from '@/types'
import { CURRENCY_SYMBOLS } from '@/types'
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

type SortField = 'invoiceNumber' | 'clientName' | 'date' | 'dueDate' | 'amount' | 'status'
type SortDirection = 'asc' | 'desc'

interface InvoiceTableProps {
  invoices: Invoice[]
  onSelectionChange: (ids: string[]) => void
}

function getInvoiceTotal(invoice: Invoice): number {
  const lineItemsTotal = invoice.lineItems.reduce((sum, item) => sum + item.price, 0)
  const expensesTotal = invoice.expenses.reduce((sum, item) => sum + item.price, 0)
  return lineItemsTotal + expensesTotal
}

function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  return `${symbol}${amount.toFixed(2)}`
}

export function InvoiceTable({ invoices, onSelectionChange }: InvoiceTableProps) {
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reminderEmail, setReminderEmail] = useState<{ to: string; subject: string; body: string } | null>(null)

  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'invoiceNumber':
          cmp = a.invoiceNumber.localeCompare(b.invoiceNumber)
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
          cmp = a.status.localeCompare(b.status)
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
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      onSelectionChange(Array.from(next))
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set())
      onSelectionChange([])
    } else {
      const allIds = new Set(invoices.map((inv) => inv.id))
      setSelectedIds(allIds)
      onSelectionChange(Array.from(allIds))
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await invoiceService.markPaid(id)
      toast.success('Invoice marked as paid')
    } catch {
      toast.error('Failed to mark invoice as paid')
    }
  }

  async function handleDelete(id: string) {
    try {
      await invoiceService.delete(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        onSelectionChange(Array.from(next))
        return next
      })
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
      body: `Dear ${invoice.to.name},\n\nThis is a friendly reminder that invoice ${invoice.invoiceNumber} dated ${format(new Date(invoice.date), 'dd/MM/yyyy')} is due on ${format(new Date(invoice.dueDate), 'dd/MM/yyyy')}.\n\nPlease let us know if you have any questions.\n\nBest regards,\n${invoice.from.name}`,
    })
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
    if (sortDir === 'asc') return <ArrowUp className="ml-1 h-3.5 w-3.5" />
    return <ArrowDown className="ml-1 h-3.5 w-3.5" />
  }

  const allSelected = invoices.length > 0 && selectedIds.size === invoices.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < invoices.length
  const now = new Date()

  return (
    <>
      <div className="overflow-x-auto">
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
                <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('invoiceNumber')}>
                  Invoice # <SortIcon field="invoiceNumber" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('clientName')}>
                  Client <SortIcon field="clientName" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('date')}>
                  Date <SortIcon field="date" />
                </Button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('dueDate')}>
                  Due Date <SortIcon field="dueDate" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('amount')}>
                  Amount <SortIcon field="amount" />
                </Button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              sortedInvoices.map((invoice) => {
                const isOverdue = invoice.status === 'sent' && new Date(invoice.dueDate) < now
                const total = getInvoiceTotal(invoice)
                return (
                  <TableRow
                    key={invoice.id}
                    data-state={selectedIds.has(invoice.id) ? 'selected' : undefined}
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
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.to.name}</TableCell>
                    <TableCell>{format(new Date(invoice.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className={`hidden lg:table-cell ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                      {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatAmount(total, invoice.currency)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View / Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/invoices/new?duplicate=${invoice.id}`)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {invoice.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => handleMarkPaid(invoice.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark Paid
                            </DropdownMenuItem>
                          )}
                          {invoice.status === 'sent' && (
                            <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Reminder
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(invoice.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
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
          onConfirmSend={() => setReminderEmail(null)}
        />
      )}
    </>
  )
}
