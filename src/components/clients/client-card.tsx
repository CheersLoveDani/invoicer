import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { clientService, db } from '@/db'
import type { Client } from '@/types'
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
import { ClientFormDialog } from './client-form-dialog'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  Pencil,
  Trash2,
} from 'lucide-react'

interface ClientCardProps {
  client: Client
}

export function ClientCard({ client }: ClientCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const invoiceCount = useLiveQuery(
    () =>
      db.invoices
        .filter((inv) => inv.to.name === client.name)
        .count(),
    [client.name],
  )

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await clientService.delete(client.id)
      toast.success(`Deleted client "${client.name}"`)
      setDeleteOpen(false)
    } catch {
      toast.error('Failed to delete client')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{client.name}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-1.5 truncate">
                <Mail className="size-3.5 shrink-0" />
                {client.email}
              </CardDescription>
            </div>
            {client.invoicePrefix && (
              <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                {client.invoicePrefix}
              </Badge>
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
                title="Edit client"
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
                title="Delete client"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="size-3.5" />
              <span>
                {invoiceCount ?? 0} invoice{invoiceCount !== 1 ? 's' : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground"
            >
              {expanded ? (
                <>
                  Less <ChevronUp className="size-3" />
                </>
              ) : (
                <>
                  More <ChevronDown className="size-3" />
                </>
              )}
            </Button>
          </div>

          {expanded && (
            <div className="space-y-3 border-t pt-3 text-sm">
              {client.address && (
                <div>
                  <p className="mb-1 font-medium text-muted-foreground">Address</p>
                  <p className="whitespace-pre-line">{client.address}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="mb-1 font-medium text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-line">{client.notes}</p>
                </div>
              )}
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Next Invoice Number
                </p>
                <p className="font-mono">
                  {client.invoicePrefix
                    ? `${client.invoicePrefix}${String(client.nextInvoiceNumber).padStart(4, '0')}`
                    : client.nextInvoiceNumber}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{client.name}</span>?
              This action cannot be undone.
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
