/**
 * The saved logo as a PNG sized for an email header. Mail apps do not show
 * SVG, so every logo is drawn onto a canvas first. Null if it cannot be drawn.
 */
export async function logoAsPng(dataUrl: string | undefined, height = 88): Promise<Blob | null> {
  if (!dataUrl) return null
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1
    // Twice the shown size, so it stays sharp on high-resolution screens
    const h = Math.min(height, img.naturalHeight || height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(h * ratio))
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
  } catch {
    return null
  }
}
