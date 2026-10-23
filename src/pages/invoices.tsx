import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { endOfDay, startOfDay } from 'date-fns'
import { Plus, CheckCircle2, Trash2, FileDown, X } from 'lucide-react'
import { toast } from 'sonner'
import { db, invoiceService, profileService } from '@/db'
import type { Invoice } from '@/types'
import { exportInvoicesAsZip, downloadBlob, getZipFilename } from '@/lib/bulk-pdf-export'
import { isOverdue } from '@/lib/invoice-amounts'
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
import { PageHeader } from '@/components/layout/page-header'

function applyFilters(invoices: Invoice[], filters: FilterState): Invoice[] {
  let result = invoices

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.to.name.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q),
    )
  }

  if (filters.status.length > 0) {
    result = result.filter((inv) => {
      const overdue = isOverdue(inv)
      if (filters.status.includes('overdue') && overdue) return true
      if (filters.status.includes('draft') && inv.status === 'draft') return true
      if (filters.status.includes('sent') && inv.status === 'sent' && !overdue) return true
      if (filters.status.includes('paid') && inv.status === 'paid') return true
      return false
    })
  }

  if (filters.clientName) {
    result = result.filter((inv) => inv.to.name === filters.clientName)
  }

  // Whole days: an invoice dated today is inside a range that ends today
  if (filters.dateRange.from) {
    const from = startOfDay(filters.dateRange.from)
    result = result.filter((inv) => new Date(inv.date) >= from)
  }
  if (filters.dateRange.to) {
    const to = endOfDay(filters.dateRange.to)
    result = result.filter((inv) => new Date(inv.date) <= to)
  }

  if (filters.currency) {
    result = result.filter((inv) => inv.currency === filters.currency)
  }

  return result
}

const plural = (n: number) => `${n} invoice${n !== 1 ? 's' : ''}`

export default function InvoicesPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkExporting, setBulkExporting] = useState(false)

  const liveInvoices = useLiveQuery(() => db.invoices.toArray())
  const allInvoices = useMemo(() => liveInvoices ?? [], [liveInvoices])

  const filteredInvoices = useMemo(
    () => applyFilters(allInvoices, filters),
    [allInvoices, filters],
  )

  // Only rows that are visible count as selected, so a bulk action never
  // touches invoices hidden by a filter or already deleted
  const selectedIds = useMemo(() => {
    const visible = new Set(filteredInvoices.map((inv) => inv.id))
    return new Set([...selection].filter((id) => visible.has(id)))
  }, [selection, filteredInvoices])
  const selected = filteredInvoices.filter((inv) => selectedIds.has(inv.id))
  const unpaidSelected = selected.filter((inv) => inv.status !== 'paid')

  async function handleBulkMarkPaid() {
    try {
      for (const inv of unpaidSelected) {
        await invoiceService.markPaid(inv.id)
      }
      toast.success(`${plural(unpaidSelected.length)} marked as paid`)
      setSelection(new Set())
    } catch {
      toast.error('Some invoices could not be marked as paid. Try again.')
    }
  }

  async function handleBulkDelete() {
    try {
      await invoiceService.deleteMultiple([...selectedIds])
      toast.success(`${plural(selectedIds.size)} deleted`)
      setSelection(new Set())
    } catch {
      toast.error('The invoices could not be deleted. Try again.')
    }
    setShowBulkDelete(false)
  }

  async function handleBulkExportPdf() {
    if (selected.length === 0) return

    setBulkExporting(true)
    const progress = toast.loading(`Making ${plural(selected.length)} into PDFs…`)
    try {
      const userProfile = await profileService.get()
      const zipBlob = await exportInvoicesAsZip(selected, userProfile)
      toast.dismiss(progress)
      const saved = await downloadBlob(zipBlob, getZipFilename(), [
        { name: 'ZIP archive', extensions: ['zip'] },
      ])
      if (saved) {
        toast.success(`${plural(selected.length)} saved as a ZIP`)
      }
    } catch (err) {
      console.error('Bulk PDF export failed:', err)
      toast.dismiss(progress)
      toast.error('The PDFs could not be made. Try again.')
    } finally {
      setBulkExporting(false)
    }
  }

  const filtersActive = filteredInvoices.length !== allInvoices.length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description={
          liveInvoices === undefined
            ? ' '
            : filtersActive
              ? `Showing ${filteredInvoices.length} of ${plural(allInvoices.length)}`
              : plural(allInvoices.length)
        }
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus />
              New invoice
            </Link>
          </Button>
        }
      />

      <InvoiceFilters filters={filters} onChange={setFilters} />

      <InvoiceTable
        invoices={filteredInvoices}
        selectedIds={selectedIds}
        onSelectionChange={setSelection}
        filtered={allInvoices.length > 0}
      />

      {/* Bulk actions float in when something is selected */}
      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 md:pl-60">
          <div
            key="bulk"
            className="pointer-events-auto flex animate-rise flex-wrap items-center gap-1.5 rounded-2xl border bg-popover/95 p-1.5 pl-4 shadow-lift backdrop-blur"
          >
            <span className="mr-2 text-sm font-medium tabular">{selectedIds.size} selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkMarkPaid}
              disabled={unpaidSelected.length === 0}
            >
              <CheckCircle2 />
              Mark as paid
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBulkExportPdf} disabled={bulkExporting}>
              <FileDown />
              {bulkExporting ? 'Saving…' : 'Save PDFs'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelection(new Set())}
              aria-label="Clear selection"
            >
              <X />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {plural(selectedIds.size)}?</DialogTitle>
            <DialogDescription>They are removed for good. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>
              Keep them
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete {plural(selectedIds.size)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
