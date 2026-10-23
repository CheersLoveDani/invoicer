import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import {
  formatInvoiceNumber,
  invoiceBelongsTo,
  lastUsedNumber,
  suggestNextNumber,
} from '@/db/services/invoice-numbering'
import { Button } from '@/components/ui/button'

/** Each client's next invoice number, worked out from what was actually sent. */
export function NextNumbers() {
  const navigate = useNavigate()
  const rows = useLiveQuery(async () => {
    const [clients, invoices] = await Promise.all([db.clients.toArray(), db.invoices.toArray()])
    return clients
      .map((client) => {
        const mine = invoices.filter((inv) => invoiceBelongsTo(client, inv))
        const last = lastUsedNumber(client, mine)
        const lastSent = mine.reduce((latest, inv) => {
          const sent = inv.sentAt ? new Date(inv.sentAt).getTime() : 0
          return Math.max(latest, sent)
        }, 0)
        return {
          client,
          next: suggestNextNumber(client, invoices),
          last: last === null ? null : formatInvoiceNumber(client.invoicePrefix, last),
          lastSent,
        }
      })
      // Clients billed most recently first
      .sort((a, b) => b.lastSent - a.lastSent)
  })

  if (!rows || rows.length === 0) return null

  return (
    <section className="rounded-xl border bg-card p-3 shadow-card">
      <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
        <h3 className="text-sm font-semibold">Next invoice numbers</h3>
        <p className="text-xs text-muted-foreground">Counted from sent invoices</p>
      </div>
      <ul className="space-y-0.5">
        {rows.map(({ client, next, last }, i) => (
          <li
            key={client.id}
            className="flex animate-rise items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
            style={{ '--i': i } as React.CSSProperties}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">
                {last ? `Last sent ${last}` : 'Nothing sent yet'}
              </p>
            </div>
            <span className="rounded-md bg-primary/8 px-2 py-1 text-sm font-semibold text-primary tabular ring-1 ring-primary/15">
              {next}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => navigate(`/invoices/new?client=${client.id}`)}
              aria-label={`New invoice for ${client.name}`}
            >
              <Plus />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
