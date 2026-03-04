import { useCallback, useRef } from 'react'
import { FileDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PdfDragCardProps {
  pdfBlob: Blob | null
  filename: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PdfDragCard({ pdfBlob, filename }: PdfDragCardProps) {
  const objectUrlRef = useRef<string | null>(null)

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!pdfBlob) return
      // Clean up any previous object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      const url = URL.createObjectURL(pdfBlob)
      objectUrlRef.current = url
      e.dataTransfer.setData('DownloadURL', `application/pdf:${filename}:${url}`)
    },
    [pdfBlob, filename],
  )

  const handleClick = useCallback(() => {
    if (!pdfBlob) return
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [pdfBlob, filename])

  if (!pdfBlob) return null

  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
        'mx-6 my-3',
      )}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        className={cn(
          'flex cursor-grab items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 px-4 py-3',
          'transition-all hover:border-primary/50 hover:bg-muted active:cursor-grabbing',
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
          <FileDown className="size-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{filename}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(pdfBlob.size)}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          Drag to attach to email or click to download
        </span>
      </div>
    </div>
  )
}
