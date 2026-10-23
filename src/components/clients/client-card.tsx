import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { clientService, db } from '@/db'
import type { Client } from '@/types'
import {
  formatInvoiceNumber,
  invoiceBelongsTo,
  lastUsedNumber,
  suggestNextNumber,
} from '@/db/services/invoice-numbering'
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

  const numbering = useLiveQuery(async () => {
    const all = await db.invoices.toArray()
    const mine = all.filter((inv) => invoiceBelongsTo(client, inv))
    const last = lastUsedNumber(client, mine)
    return {
      count: mine.length,
      last: last === null ? null : formatInvoiceNumber(client.invoicePrefix, last),
      next: suggestNextNumber(client, all),
    }
  }, [client])
  const invoiceCount = numbering?.count

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await clientService.delete(client.id)
      toast.success(`Deleted client "${client.name}"`)
      setDeleteOpen(false)
    } catch {
      toast.error('The client was not deleted. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
<Card className="transition-[box-shadow,transform,border-color] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lift">
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
              <Badge variant="secondary" className="shrink-0 text-xs">
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
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">Last sent</p>
              <p className="font-medium tabular">{numbering?.last ?? '—'}</p>
            </div>
            <div className="rounded-lg bg-primary/8 px-3 py-2 ring-1 ring-primary/15">
              <p className="text-xs text-muted-foreground">Next up</p>
              <p className="font-semibold text-primary tabular">{numbering?.next ?? '—'}</p>
            </div>
          </div>
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
            <DialogTitle>Delete {client.name}?</DialogTitle>
            <DialogDescription>
              Their schedules are removed and their templates are unlinked. Invoices already made keep the client's details.
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
              {deleting ? 'Deleting…' : 'Delete client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
