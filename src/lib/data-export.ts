import { format } from 'date-fns'
import { db, settingsService } from '@/db'

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
 * Triggers a browser file download of the given export data as JSON.
 * Filename format: invoicer-backup-YYYY-MM-DD.json
 */
export function downloadExportFile(data: ExportData): void {
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
}

/**
 * Full export flow: build data, trigger download, update lastBackupDate.
 */
export async function exportAllData(): Promise<void> {
  const data = await buildExportData()
  downloadExportFile(data)
  await settingsService.save({ lastBackupDate: new Date() })
}
