import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { settingsService } from '@/db/services/settings-service'
import type { Theme } from '@/types'

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

/** The saved theme, shared by every caller, applied to the document. */
export function useTheme() {
  const theme: Theme =
    useLiveQuery(async () => (await db.appSettings.get('app-settings'))?.theme) ?? 'system'

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    applyTheme(newTheme)
    void settingsService.save({ theme: newTheme })
  }

  return { theme, setTheme }
}
