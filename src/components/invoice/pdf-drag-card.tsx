import { useCallback, useRef } from 'react'
import { FileDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveBlob } from '@/lib/native/save-file'

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
    void saveBlob(pdfBlob, {
      suggestedName: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
  }, [pdfBlob, filename])

  if (!pdfBlob) return null

  return (
    <div
      className={cn(
        'animate-rise',
        'mx-4 my-3 md:mx-8',
      )}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        className={cn(
          'flex cursor-grab items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] px-4 py-3',
          'transition-[border-color,background-color,transform] duration-150 hover:border-primary hover:bg-primary/[0.07] active:scale-[0.99] active:cursor-grabbing',
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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileDown className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{filename}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(pdfBlob.size)}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          Drag onto your email to attach, or click to save
        </span>
      </div>
    </div>
  )
}
