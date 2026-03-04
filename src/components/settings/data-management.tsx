import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db, settingsService } from '@/db'
import { format } from 'date-fns'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Download,
  Upload,
  FileText,
  AlertTriangle,
} from 'lucide-react'

interface ImportData {
  version: number
  exportedAt: string
  userProfile: unknown[]
  clients: unknown[]
  templates: unknown[]
  invoices: unknown[]
  schedules: unknown[]
  appSettings: unknown[]
}

interface ImportCounts {
  userProfile: number
  clients: number
  templates: number
  invoices: number
  schedules: number
  appSettings: number
}

function isValidImportData(data: unknown): data is ImportData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.version === 'number' &&
    Array.isArray(d.clients) &&
    Array.isArray(d.invoices) &&
    Array.isArray(d.templates) &&
    Array.isArray(d.schedules) &&
    Array.isArray(d.appSettings) &&
    Array.isArray(d.userProfile)
  )
}

export function DataManagement() {
  const settings = useLiveQuery(() => db.appSettings.get('app-settings'))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importData, setImportData] = useState<ImportData | null>(null)
  const [importCounts, setImportCounts] = useState<ImportCounts | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        userProfile: await db.userProfile.toArray(),
        clients: await db.clients.toArray(),
        templates: await db.templates.toArray(),
        invoices: await db.invoices.toArray(),
        schedules: await db.schedules.toArray(),
        appSettings: await db.appSettings.toArray(),
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      const a = document.createElement('a')
      a.href = url
      a.download = `invoicer-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Update last backup date
      await settingsService.save({ lastBackupDate: new Date() })
      toast.success('Data exported successfully')
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
      const parsed = JSON.parse(text)

      if (!isValidImportData(parsed)) {
        toast.error(
          'Invalid backup file. Missing required fields (version, clients, invoices, etc.).'
        )
        return
      }

      setImportData(parsed)
      setImportCounts({
        userProfile: parsed.userProfile.length,
        clients: parsed.clients.length,
        templates: parsed.templates.length,
        invoices: parsed.invoices.length,
        schedules: parsed.schedules.length,
        appSettings: parsed.appSettings.length,
      })
      setShowConfirm(true)
    } catch {
      toast.error('Failed to parse backup file. Please ensure it is valid JSON.')
    }
  }

  const handleImportConfirm = async () => {
    if (!importData) return

    setImporting(true)
    try {
      // Clear existing data
      await db.transaction(
        'rw',
        [db.userProfile, db.clients, db.templates, db.invoices, db.schedules, db.appSettings],
        async () => {
          await db.userProfile.clear()
          await db.clients.clear()
          await db.templates.clear()
          await db.invoices.clear()
          await db.schedules.clear()
          await db.appSettings.clear()

          // Import data
          if (importData.userProfile.length > 0) {
            await db.userProfile.bulkAdd(importData.userProfile as never[])
          }
          if (importData.clients.length > 0) {
            await db.clients.bulkAdd(importData.clients as never[])
          }
          if (importData.templates.length > 0) {
            await db.templates.bulkAdd(importData.templates as never[])
          }
          if (importData.invoices.length > 0) {
            await db.invoices.bulkAdd(importData.invoices as never[])
          }
          if (importData.schedules.length > 0) {
            await db.schedules.bulkAdd(importData.schedules as never[])
          }
          if (importData.appSettings.length > 0) {
            await db.appSettings.bulkAdd(importData.appSettings as never[])
          }
        }
      )

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

      {/* PDF Export Placeholder */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Bulk PDF Export</h3>
          <p className="text-sm text-muted-foreground">
            Export all invoices as individual PDF files.
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button type="button" variant="outline" disabled>
                  <FileText className="mr-2 h-4 w-4" />
                  Export All Invoices as PDFs
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
