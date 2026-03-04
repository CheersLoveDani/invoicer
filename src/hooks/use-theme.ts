import { useEffect, useState } from 'react'
import { settingsService } from '@/db/services/settings-service'
import type { Theme } from '@/types'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')

  // Load initial theme from settings
  useEffect(() => {
    settingsService.get().then((settings) => {
      setThemeState(settings.theme)
      applyTheme(settings.theme)
    })
  }, [])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    settingsService.save({ theme: newTheme })
  }

  return { theme, setTheme }
}
