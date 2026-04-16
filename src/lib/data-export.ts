import { format } from 'date-fns'
import { db, settingsService } from '@/db'
import { saveBlob } from '@/lib/native/save-file'

export interface ExportData {
  version: number
  exportedAt: string
  userProfile: unknown[]
  clients: unknown[]
  templates: unknown[]
  invoices: unknown[]
  schedules: unknown[]
  appSettings: unknown[]
}

/**
 * Queries all 6 DB tables and bundles into a versioned JSON export object.
 */
export async function buildExportData(): Promise<ExportData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfile: await db.userProfile.toArray(),
    clients: await db.clients.toArray(),
    templates: await db.templates.toArray(),
    invoices: await db.invoices.toArray(),
    schedules: await db.schedules.toArray(),
    appSettings: await db.appSettings.toArray(),
  }
}

/**
 * Saves the export data as JSON. Returns true if the file was written,
 * false if the user cancelled the native save dialog.
 */
export async function downloadExportFile(data: ExportData): Promise<boolean> {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  return saveBlob(blob, {
    suggestedName: `invoicer-backup-${dateStr}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
}

/**
 * Full export flow: build data, save it, update lastBackupDate on success.
 * Returns true when the backup was actually written.
 */
export async function exportAllData(): Promise<boolean> {
  const data = await buildExportData()
  const saved = await downloadExportFile(data)
  if (saved) {
    await settingsService.save({ lastBackupDate: new Date() })
  }
  return saved
}
