import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { templateService, db } from '@/db'
import type { InvoiceTemplate } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TemplateFormDialog } from './template-form-dialog'
import { FileText, Layers, Pencil, Plus, Trash2, User } from 'lucide-react'

interface TemplateCardProps {
  template: InvoiceTemplate
}

const PDF_TEMPLATE_LABELS: Record<string, string> = {
  clean: 'Clean',
  modern: 'Modern',
  compact: 'Compact',
}

export function TemplateCard({ template }: TemplateCardProps) {
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const linkedClient = useLiveQuery(
    () =>
      template.clientId
        ? db.clients.get(template.clientId)
        : undefined,
    [template.clientId],
  )

  const totalItems = template.lineItems.length + template.expenses.length

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await templateService.delete(template.id)
      toast.success(`Deleted template "${template.name}"`)
      setDeleteOpen(false)
    } catch {
      toast.error('Failed to delete template')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              {template.name}
            </CardTitle>
            {template.title && (
              <CardDescription className="mt-1 truncate">
                {template.title}
              </CardDescription>
            )}
          </div>
          <CardAction>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditOpen(true)
                }}
                title="Edit template"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteOpen(true)
                }}
                title="Delete template"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {linkedClient && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="size-3.5" />
                <span className="truncate">{linkedClient.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Layers className="size-3.5" />
              <span>
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <FileText className="size-3" />
              {PDF_TEMPLATE_LABELS[template.pdfTemplate] ?? template.pdfTemplate}
            </Badge>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => navigate(`/invoices/new?template=${template.id}`)}
          >
            <Plus className="mr-1 size-3.5" />
            Create Invoice
          </Button>
        </CardContent>
      </Card>

      <TemplateFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        template={template}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {template.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
