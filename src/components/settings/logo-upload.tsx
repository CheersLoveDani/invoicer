import { useCallback, useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LogoUploadProps {
  value?: string
  onChange: (logo: string | undefined) => void
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

export function LogoUpload({ value, onChange }: LogoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndConvert = useCallback(
    (file: File) => {
      setError(null)

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Invalid file type. Please upload a PNG, JPG, or SVG file.')
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 2MB.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onChange(result)
      }
      reader.onerror = () => {
        setError('Failed to read file. Please try again.')
      }
      reader.readAsDataURL(file)
    },
    [onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        validateAndConvert(file)
      }
    },
    [validateAndConvert]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        validateAndConvert(file)
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [validateAndConvert]
  )

  const handleRemove = useCallback(() => {
    setError(null)
    onChange(undefined)
  }, [onChange])

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border bg-muted">
            <img
              src={value}
              alt="Logo preview"
              className="h-full w-full object-contain p-2"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Current logo</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
            >
              <X className="mr-1 h-3 w-3" />
              Remove logo
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
        >
          <div className="mb-3 rounded-full bg-muted p-3">
            {isDragOver ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <p className="mb-1 text-sm font-medium">
            {isDragOver ? 'Drop your logo here' : 'Drag and drop your logo'}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            PNG, JPG, or SVG (max 2MB)
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1 h-3 w-3" />
            Choose file
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
