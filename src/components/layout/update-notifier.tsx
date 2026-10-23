import { useEffect } from 'react'
import { toast } from 'sonner'
import { updater } from '@/lib/native/updater'

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Checks for a new version on launch and every few hours. Once one has
 * downloaded, offers a restart; it is never installed without asking, so an
 * invoice being edited is never lost.
 */
export function UpdateNotifier() {
  useEffect(() => {
    if (!updater.supported) return
    let offered: string | null = null
    const stop = updater.subscribe(() => {
      const { status, version } = updater.getState()
      if (status !== 'ready' || !version || offered === version) return
      offered = version
      toast(`Invoicer ${version} is ready`, {
        description: 'Restart to finish updating. You can also do this later from Settings.',
        duration: Infinity,
        action: { label: 'Restart', onClick: () => void updater.install() },
      })
    })
    const check = () => void updater.check()
    const first = setTimeout(check, 3000)
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    window.addEventListener('online', check)
    return () => {
      stop()
      clearTimeout(first)
      clearInterval(interval)
      window.removeEventListener('online', check)
    }
  }, [])

  return null
}
