import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, CheckCircle2, Trash2, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { db, invoiceService, profileService } from '@/db'
import type { Invoice } from '@/types'
import { exportInvoicesAsZip, downloadBlob, getZipFilename } from '@/lib/bulk-pdf-export'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InvoiceFilters, defaultFilters, type FilterState } from '@/components/invoices/invoice-filters'
import { InvoiceTable } from '@/components/invoices/invoice-table'

function isOverdue(invoice: Invoice): boolean {
  return invoice.status === 'sent' && new Date(invoice.dueDate) < new Date()
}

function applyFilters(invoices: Invoice[], filters: FilterState): Invoice[] {
  let result = invoices

  // Search filter
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.to.name.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q)
    )
  }

  // Status filter
  if (filters.status.length > 0) {
    result = result.filter((inv) => {
      if (filters.status.includes('overdue') && isOverdue(inv)) return true
      if (filters.status.includes('draft') && inv.status === 'draft') return true
      if (filters.status.includes('sent') && inv.status === 'sent' && !isOverdue(inv)) return true
      if (filters.status.includes('paid') && inv.status === 'paid') return true
      return false
    })
  }

  // Client name filter
  if (filters.clientName) {
    result = result.filter((inv) => inv.to.name === filters.clientName)
  }

  // Date range filter
  if (filters.dateRange.from) {
    const from = filters.dateRange.from
    result = result.filter((inv) => new Date(inv.date) >= from)
  }
  if (filters.dateRange.to) {
    const to = filters.dateRange.to
    result = result.filter((inv) => new Date(inv.date) <= to)
  }

  // Currency filter
  if (filters.currency) {
    result = result.filter((inv) => inv.currency === filters.currency)
  }

  return result
}

export default function InvoicesPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkExporting, setBulkExporting] = useState(false)

  const allInvoices = useLiveQuery(() => db.invoices.toArray()) ?? []

  const filteredInvoices = useMemo(
    () => applyFilters(allInvoices, filters),
    [allInvoices, filters]
  )

  async function handleBulkMarkPaid() {
    try {
      for (const id of selectedIds) {
        await invoiceService.markPaid(id)
      }
      toast.success(`${selectedIds.length} invoice(s) marked as paid`)
      setSelectedIds([])
    } catch {
      toast.error('Failed to mark invoices as paid')
    }
  }

  async function handleBulkDelete() {
    try {
      await invoiceService.deleteMultiple(selectedIds)
      toast.success(`${selectedIds.length} invoice(s) deleted`)
      setSelectedIds([])
    } catch {
      toast.error('Failed to delete invoices')
    }
    setShowBulkDelete(false)
  }

  async function handleBulkExportPdf() {
    if (selectedIds.length === 0) return

    setBulkExporting(true)
    try {
      const selectedInvoices = allInvoices.filter((inv) => selectedIds.includes(inv.id))
      const userProfile = await profileService.get()

      toast.info(`Generating ${selectedInvoices.length} PDF(s)...`)

      const zipBlob = await exportInvoicesAsZip(selectedInvoices, userProfile)
      downloadBlob(zipBlob, getZipFilename())

      toast.success(`${selectedInvoices.length} invoice(s) exported as ZIP`)
    } catch (err) {
      console.error('Bulk PDF export failed:', err)
      toast.error('Failed to export invoices as PDFs')
    } finally {
      setBulkExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">
            Manage your invoices here.
          </p>
        </div>
        <Button asChild>
          <Link to="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <InvoiceFilters filters={filters} onChange={setFilters} />

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.length} invoice{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={handleBulkMarkPaid}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Mark Paid
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkDelete(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExportPdf}
              disabled={bulkExporting}
            >
              <FileDown className="mr-1 h-4 w-4" />
              {bulkExporting ? 'Exporting...' : 'Export as PDFs'}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <InvoiceTable invoices={filteredInvoices} onSelectionChange={setSelectedIds} />

      {/* Bulk delete confirmation */}
      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoices</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} invoice{selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete {selectedIds.length} invoice{selectedIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
