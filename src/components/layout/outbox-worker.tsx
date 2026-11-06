import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { nextWakeAt, runAutoSend } from '@/lib/auto-send'
import {
  backgroundPassDone,
  onBackgroundClosing,
  reportNextWake,
  setBackgroundMode,
  setStartAtLogin,
} from '@/lib/native/mail'
import { isTauri } from '@/lib/runtime'

const CHECK_EVERY_MS = 60 * 1000
/** Time for native notifications to go out before a hidden run closes. */
const SETTLE_MS = 5 * 1000

const settle = () => new Promise((resolve) => window.setTimeout(resolve, SETTLE_MS))

/**
 * Runs the desktop outbox while the window is open, and tells the tray
 * process when to wake the app once it is closed. Renders nothing.
 */
export function OutboxWorker() {
  const settings = useLiveQuery(async () => {
    const s = await db.appSettings.get('app-settings')
    const background = s?.runInBackground ?? false
    return { background, startAtLogin: s?.startAtLogin ?? background }
  })
  const nextWake = useLiveQuery(() => (isTauri() ? nextWakeAt() : null))

  useEffect(() => {
    if (!isTauri()) return
    // A hidden run (woken by the tray) closes itself after its first pass
    void runAutoSend()
      .then(settle)
      .then(backgroundPassDone)
      .catch((err) => console.error('Background pass did not finish:', err))
    const timer = window.setInterval(() => void runAutoSend(), CHECK_EVERY_MS)
    // Closed while background mode is on: finish any send before the window goes
    const unlisten = onBackgroundClosing(() => {
      void runAutoSend()
        .then(() => nextWakeAt())
        .then(reportNextWake)
        .then(backgroundPassDone)
    })
    return () => {
      window.clearInterval(timer)
      void unlisten.then((stop) => stop())
    }
  }, [])

  useEffect(() => {
    if (nextWake === undefined) return
    reportNextWake(nextWake).catch((err) => console.error('Could not set the next wake time:', err))
  }, [nextWake])

  // Follows the saved settings, including after a backup is restored
  useEffect(() => {
    if (!settings) return
    setBackgroundMode(settings.background).catch((err) =>
      console.error('Could not change background mode:', err),
    )
    setStartAtLogin(settings.startAtLogin).catch((err) =>
      console.error('Could not change start at sign-in:', err),
    )
  }, [settings?.background, settings?.startAtLogin]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
