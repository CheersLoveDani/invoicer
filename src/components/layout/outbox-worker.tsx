import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { runAutoSend } from '@/lib/auto-send'
import { setBackgroundMode } from '@/lib/native/mail'
import { isTauri } from '@/lib/runtime'

const CHECK_EVERY_MS = 60 * 1000

/** Runs the desktop outbox while the app is open (or in the tray). Renders nothing. */
export function OutboxWorker() {
  const runInBackground = useLiveQuery(
    async () => (await db.appSettings.get('app-settings'))?.runInBackground ?? false,
  )

  useEffect(() => {
    if (!isTauri()) return
    void runAutoSend()
    const timer = window.setInterval(() => void runAutoSend(), CHECK_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [])

  // Follows the saved setting, including after a backup is restored
  useEffect(() => {
    if (runInBackground === undefined) return
    setBackgroundMode(runInBackground).catch((err) =>
      console.error('Could not change background mode:', err),
    )
  }, [runInBackground])

  return null
}
