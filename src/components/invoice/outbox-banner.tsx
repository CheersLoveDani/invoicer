import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MailCheck, MailWarning, Send } from 'lucide-react'
import { toast } from 'sonner'
import { invoiceService } from '@/db'
import { MAX_ATTEMPTS, queueForSending } from '@/lib/auto-send'
import { errorMessage, sendInvoiceNow } from '@/lib/invoice-mailer'
import type { InvoiceOutbox } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OutboxBannerProps {
  invoiceId: string
  invoiceNumber: string
  recipient: string
  outbox: InvoiceOutbox
  /** Saves unsaved edits so the email carries them. */
  beforeSend: () => Promise<void>
  onSent: () => void
}

/** Shown on an invoice the app is waiting to email: approve it, retry it, or stop it. */
export function OutboxBanner({ invoiceId, invoiceNumber, recipient, outbox, beforeSend, onSent }: OutboxBannerProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const to = recipient || 'the client'

  async function approve() {
    setBusy(true)
    try {
      await beforeSend()
      await sendInvoiceNow(invoiceId)
      toast.success(`${invoiceNumber || 'Invoice'} sent to ${to}`)
      // A sent test invoice is deleted, so there is nothing left to show here
      if (outbox.test) navigate('/scheduled')
      else onSent()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    await invoiceService.cancelOutbox(invoiceId)
    if (outbox.test) {
      toast.success('Test invoice removed')
      navigate('/scheduled')
    } else {
      toast.success('It will not be sent automatically. It stays a draft.')
    }
  }

  const failed = outbox.state === 'failed'
  const sending = outbox.state === 'queued' || outbox.state === 'sending'
  const willRetry = failed && outbox.attempts < MAX_ATTEMPTS

  return (
    <div
      role="status"
      className={cn(
        'flex shrink-0 animate-rise flex-wrap items-center gap-3 border-b px-4 py-3 md:px-8',
        failed ? 'bg-destructive/8' : 'bg-info/8',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          failed ? 'bg-destructive/12 text-destructive' : 'bg-info/12 text-info',
        )}
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : failed ? <MailWarning className="size-4" /> : <MailCheck className="size-4" />}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {outbox.state === 'awaiting-approval' && (
          <>
            <p className="font-medium">Made by a schedule and waiting for your OK</p>
            <p className="text-muted-foreground">
              Check it, then send it to {to}.
              {outbox.error && <span className="text-destructive"> Last try: {outbox.error}</span>}
            </p>
          </>
        )}
        {sending && <p className="font-medium">Sending to {to}…</p>}
        {failed && (
          <>
            <p className="font-medium">Not sent to {to}</p>
            <p className="text-muted-foreground">
              {outbox.error}
              {willRetry && ' Invoicer will try again shortly.'}
            </p>
          </>
        )}
      </div>
      {!sending && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={stop} disabled={busy}>
            Don't send
          </Button>
          {failed ? (
            <Button size="sm" onClick={() => void queueForSending(invoiceId)} disabled={busy}>
              <Send />
              Try again
            </Button>
          ) : (
            <Button size="sm" onClick={approve} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              Approve and send
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
