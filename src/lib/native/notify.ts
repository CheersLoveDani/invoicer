import { isTauri } from '@/lib/runtime'

/**
 * Fire a system notification when running under Tauri.
 * No-op on the web build (the in-app notification panel handles that case).
 */
export async function nativeNotify(title: string, body: string): Promise<void> {
  if (!isTauri()) return
  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted) {
      const result = await requestPermission()
      granted = result === 'granted'
    }
    if (granted) {
      sendNotification({ title, body })
    }
  } catch {
    // Best effort — never let a notification failure crash anything.
  }
}
