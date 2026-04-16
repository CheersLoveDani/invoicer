import { isTauri } from '@/lib/runtime'

export interface SaveFilter {
  name: string
  extensions: string[]
}

export interface SaveBlobOptions {
  suggestedName: string
  filters?: SaveFilter[]
}

/**
 * Save a Blob to disk. Uses the native save dialog under Tauri,
 * falls back to the browser anchor-click pattern on the web.
 * Returns true if the file was saved, false if the user cancelled.
 */
export async function saveBlob(
  blob: Blob,
  options: SaveBlobOptions,
): Promise<boolean> {
  if (isTauri()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ])
    const path = await save({
      defaultPath: options.suggestedName,
      filters: options.filters,
    })
    if (!path) return false
    const bytes = new Uint8Array(await blob.arrayBuffer())
    await writeFile(path, bytes)
    return true
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = options.suggestedName
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}
