import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Loader2, MailCheck, MailWarning, Send } from 'lucide-react'
import { db, invoiceService } from '@/db'
import { MAX_ATTEMPTS, queueForSending } from '@/lib/auto-send'
import { errorMessage, sendInvoiceNow } from '@/lib/invoice-mailer'
import { invoiceTotal } from '@/lib/invoice-amounts'
import { formatCurrency } from '@/lib/pdf-utils'
import type { Invoice } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function OutboxRow({ invoice, index }: { invoice: Invoice; index: number }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const box = invoice.outbox!
  const label = invoice.invoiceNumber || 'Untitled invoice'
  const to = invoice.to.name || invoice.to.email || 'No client'
  const sending = box.state === 'queued' || box.state === 'sending'
  const failed = box.state === 'failed'

  async function approve() {
    setBusy(true)
    try {
      await sendInvoiceNow(invoice.id)
      toast.success(`${label} sent to ${invoice.to.email}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    await invoiceService.setOutbox(invoice.id, undefined)
    toast.success(`${label} will not be sent automatically. It stays a draft.`)
  }

  return (
    <div
      className="flex animate-rise flex-wrap items-center gap-4 border-b px-4 py-3.5 last:border-b-0"
      style={{ '--i': index } as React.CSSProperties}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          failed ? 'bg-destructive/10 text-destructive' : 'bg-info/10 text-info',
        )}
      >
        {sending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : failed ? (
          <MailWarning className="size-4" />
        ) : (
          <MailCheck className="size-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{label}</span>
          <span className="truncate text-sm text-muted-foreground">{to}</span>
          <Badge
            className={cn(
              failed ? 'bg-destructive/10 text-destructive' : sending ? 'bg-muted text-muted-foreground' : 'bg-info/10 text-info',
            )}
          >
            {failed ? 'Not sent' : sending ? 'Sending' : 'Waiting for you'}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {failed ? (
            <>
              {box.error}
              {box.attempts < MAX_ATTEMPTS && ' Trying again shortly.'}
            </>
          ) : (
            <>
              <span className="tabular">{formatCurrency(invoiceTotal(invoice), invoice.currency)}</span>
              {' · '}made {format(new Date(invoice.date), 'd MMM')} · due {format(new Date(invoice.dueDate), 'd MMM yyyy')}
              {box.error && <span className="text-destructive"> · Last try: {box.error}</span>}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${invoice.id}`)}>
          Review
        </Button>
        {!sending && (
          <Button variant="ghost" size="sm" onClick={stop} disabled={busy}>
            Don't send
          </Button>
        )}
        {failed ? (
          <Button size="sm" onClick={() => void queueForSending(invoice.id)}>
            <Send />
            Try again
          </Button>
        ) : (
          !sending && (
            <Button size="sm" onClick={approve} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              Approve and send
            </Button>
          )
        )}
      </div>
    </div>
  )
}

/** Invoices made by schedules that are waiting to be approved, are sending, or did not send. */
export function OutboxList() {
  const waiting = useLiveQuery(() =>
    db.invoices
      .where('status')
      .equals('draft')
      .filter((inv) => !!inv.outbox)
      .sortBy('date'),
  )

  if (!waiting) return <div className="h-20 skeleton rounded-xl" />

  if (waiting.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
        <MailCheck className="size-5 shrink-0 text-muted-foreground/60" />
        Nothing is waiting. Invoices made by schedules that ask before sending appear here.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      {waiting.map((invoice, i) => (
        <OutboxRow key={invoice.id} invoice={invoice} index={i} />
      ))}
    </div>
  )
}
