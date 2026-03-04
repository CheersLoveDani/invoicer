import { db } from '@/db'

export interface ImportData {
  version: number
  exportedAt: string
  userProfile: unknown[]
  clients: unknown[]
  templates: unknown[]
  invoices: unknown[]
  schedules: unknown[]
  appSettings: unknown[]
}

export interface ImportCounts {
  userProfile: number
  clients: number
  templates: number
  invoices: number
  schedules: number
  appSettings: number
}

const REQUIRED_KEYS: (keyof ImportData)[] = [
  'userProfile',
  'clients',
  'templates',
  'invoices',
  'schedules',
  'appSettings',
]

/**
 * Validates that the parsed JSON is a valid ImportData structure.
 * Checks for version number and that all 6 table arrays are present.
 */
export function isValidImportData(data: unknown): data is ImportData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.version !== 'number') return false
  return REQUIRED_KEYS.every((key) => Array.isArray(d[key]))
}

/**
 * Parses a backup file string into validated ImportData.
 * Returns the data + record counts, or throws if invalid.
 */
export function parseImportFile(text: string): {
  data: ImportData
  counts: ImportCounts
} {
  const parsed: unknown = JSON.parse(text)

  if (!isValidImportData(parsed)) {
    throw new Error(
      'Invalid backup file. Missing required fields (version, clients, invoices, etc.).'
    )
  }

  const counts: ImportCounts = {
    userProfile: parsed.userProfile.length,
    clients: parsed.clients.length,
    templates: parsed.templates.length,
    invoices: parsed.invoices.length,
    schedules: parsed.schedules.length,
    appSettings: parsed.appSettings.length,
  }

  return { data: parsed, counts }
}

/**
 * Clears all existing data and bulk-imports the provided backup data
 * inside a single transaction.
 */
export async function importAllData(data: ImportData): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.userProfile,
      db.clients,
      db.templates,
      db.invoices,
      db.schedules,
      db.appSettings,
    ],
    async () => {
      // Clear existing data
      await db.userProfile.clear()
      await db.clients.clear()
      await db.templates.clear()
      await db.invoices.clear()
      await db.schedules.clear()
      await db.appSettings.clear()

      // Bulk-import
      if (data.userProfile.length > 0) {
        await db.userProfile.bulkAdd(data.userProfile as never[])
      }
      if (data.clients.length > 0) {
        await db.clients.bulkAdd(data.clients as never[])
      }
      if (data.templates.length > 0) {
        await db.templates.bulkAdd(data.templates as never[])
      }
      if (data.invoices.length > 0) {
        await db.invoices.bulkAdd(data.invoices as never[])
      }
      if (data.schedules.length > 0) {
        await db.schedules.bulkAdd(data.schedules as never[])
      }
      if (data.appSettings.length > 0) {
        await db.appSettings.bulkAdd(data.appSettings as never[])
      }
    }
  )
}
