import { useSyncExternalStore } from 'react'
import type { Update } from '@tauri-apps/plugin-updater'
import { isTauri } from '@/lib/runtime'

/**
 * Self-update for the desktop app. New versions come from the latest GitHub
 * release's signed latest.json: they download in the background and are
 * installed (which restarts the app) only when the user says so.
 */

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'none'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'failed'

export interface UpdateState {
  status: UpdateStatus
  version: string | null
  notes: string | null
}

export const APP_VERSION = __APP_VERSION__

let state: UpdateState = { status: 'idle', version: null, notes: null }
let pending: Update | null = null
const listeners = new Set<() => void>()

function set(next: Partial<UpdateState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

const busy = () => ['checking', 'downloading', 'installing'].includes(state.status)

export const updater = {
  supported: isTauri(),

  getState: () => state,

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  /** Look for a newer release and download it. Quiet when there is none. */
  async check(): Promise<void> {
    if (!updater.supported || busy() || state.status === 'ready') return
    try {
      set({ status: 'checking' })
      const { check } = await import('@tauri-apps/plugin-updater')
      pending = await check()
      if (!pending) return set({ status: 'none', version: null, notes: null })
      set({ status: 'downloading', version: pending.version, notes: pending.body ?? null })
      await pending.download()
      set({ status: 'ready' })
    } catch (err) {
      console.error('Update check failed:', err)
      set({ status: state.version ? 'failed' : 'none' })
    }
  },

  /** Install the downloaded update and restart into it. */
  async install(): Promise<void> {
    if (!pending || busy()) return
    try {
      if (state.status !== 'ready') {
        set({ status: 'downloading' })
        await pending.download()
      }
      set({ status: 'installing' })
      await pending.install()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (err) {
      console.error('Update install failed:', err)
      set({ status: 'failed' })
    }
  },
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(updater.subscribe, updater.getState)
}
