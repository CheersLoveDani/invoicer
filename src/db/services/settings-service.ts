import { db } from '@/db/database'
import type { AppSettings } from '@/types'

const SETTINGS_ID = 'app-settings'

const defaultSettings: AppSettings = {
  id: SETTINGS_ID,
  theme: 'system',
  defaultDueDays: 30,
  defaultPdfTemplate: 'clean',
  backupReminderDays: 30,
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    const settings = await db.appSettings.get(SETTINGS_ID)
    return settings ?? { ...defaultSettings }
  },

  async save(data: Partial<AppSettings>): Promise<void> {
    const existing = await db.appSettings.get(SETTINGS_ID)
    if (existing) {
      await db.appSettings.update(SETTINGS_ID, data)
    } else {
      await db.appSettings.add({
        ...defaultSettings,
        ...data,
        id: SETTINGS_ID,
      })
    }
  },
}
