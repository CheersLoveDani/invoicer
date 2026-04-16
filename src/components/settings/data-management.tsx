import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db, profileService } from '@/db'
import { format } from 'date-fns'
import { exportAllData } from '@/lib/data-export'
import {
  parseImportFile,
  importAllData,
  type ImportData,
  type ImportCounts,
} from '@/lib/data-import'
import { exportInvoicesAsZip, downloadBlob, getZipFilename } from '@/lib/bulk-pdf-export'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Download,
  Upload,
  FileText,
  AlertTriangle,
} from 'lucide-react'

export function DataManagement() {
  const settings = useLiveQuery(() => db.appSettings.get('app-settings'))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importData, setImportData] = useState<ImportData | null>(null)
  const [importCounts, setImportCounts] = useState<ImportCounts | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [bulkPdfExporting, setBulkPdfExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const saved = await exportAllData()
      if (saved) {
        toast.success('Data exported successfully')
      }
    } catch {
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      const text = await file.text()
      const { data, counts } = parseImportFile(text)
      setImportData(data)
      setImportCounts(counts)
      setShowConfirm(true)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to parse backup file. Please ensure it is valid JSON.'
      )
    }
  }

  const handleImportConfirm = async () => {
    if (!importData) return

    setImporting(true)
    try {
      await importAllData(importData)
      toast.success('Data imported successfully')
      setShowConfirm(false)
      setImportData(null)
      setImportCounts(null)
    } catch {
      toast.error('Failed to import data')
    } finally {
      setImporting(false)
    }
  }

  const handleImportCancel = () => {
    setShowConfirm(false)
    setImportData(null)
    setImportCounts(null)
  }

  const handleBulkPdfExport = async () => {
    setBulkPdfExporting(true)
    try {
      const allInvoices = await db.invoices.toArray()

      if (allInvoices.length === 0) {
        toast.info('No invoices to export')
        return
      }

      const userProfile = await profileService.get()

      toast.info(`Generating ${allInvoices.length} PDF(s)...`)

      const zipBlob = await exportInvoicesAsZip(allInvoices, userProfile)
      const saved = await downloadBlob(zipBlob, getZipFilename(), [
        { name: 'ZIP archive', extensions: ['zip'] },
      ])

      if (saved) {
        toast.success(`${allInvoices.length} invoice(s) exported as ZIP`)
      }
    } catch (err) {
      console.error('Bulk PDF export failed:', err)
      toast.error('Failed to export invoices as PDFs')
    } finally {
      setBulkPdfExporting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Export Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Export Data</h3>
          <p className="text-sm text-muted-foreground">
            Download all your data as a JSON backup file.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export All Data'}
          </Button>

          {settings?.lastBackupDate && (
            <p className="text-sm text-muted-foreground">
              Last backup:{' '}
              {format(new Date(settings.lastBackupDate), 'PPP p')}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Import Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Import Data</h3>
          <p className="text-sm text-muted-foreground">
            Restore data from a previously exported backup file. This will
            replace all existing data.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import Data
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Separator />

      {/* PDF Export Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Bulk PDF Export</h3>
          <p className="text-sm text-muted-foreground">
            Export all invoices as individual PDF files bundled in a ZIP archive.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleBulkPdfExport}
          disabled={bulkPdfExporting}
        >
          <FileText className="mr-2 h-4 w-4" />
          {bulkPdfExporting ? 'Exporting...' : 'Export All Invoices as PDFs'}
        </Button>
      </div>

      {/* Import Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={handleImportCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Data Import
            </DialogTitle>
            <DialogDescription>
              This will replace all existing data with the imported backup.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {importCounts && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium">
                The following data will be imported:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>{importCounts.clients} client(s)</li>
                <li>{importCounts.invoices} invoice(s)</li>
                <li>{importCounts.templates} template(s)</li>
                <li>{importCounts.schedules} schedule(s)</li>
                {importCounts.userProfile > 0 && (
                  <li>{importCounts.userProfile} user profile(s)</li>
                )}
                {importCounts.appSettings > 0 && (
                  <li>{importCounts.appSettings} settings entry/entries</li>
                )}
              </ul>
              {importData?.exportedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Exported on:{' '}
                  {format(new Date(importData.exportedAt), 'PPP p')}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleImportCancel}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleImportConfirm}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Replace All Data & Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
