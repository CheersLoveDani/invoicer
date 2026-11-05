import {
  clientService,
  db,
  invoiceService,
  profileService,
  settingsService,
} from '@/db'
import { invoiceFromTemplate } from '@/lib/invoice-from-template'
import { claimForSending, deliverInvoice, errorMessage } from '@/lib/invoice-mailer'
import { nativeNotify } from '@/lib/native/notify'
import { isTauri } from '@/lib/runtime'
import { nextScheduleDate } from '@/lib/schedule-dates'
import type { Invoice, Schedule, ScheduleSendMode } from '@/types'

/**
 * The desktop app's outbox. Schedules set to "ask me first" or "send
 * automatically" make their invoice when due; automatic ones (and ones the
 * user approved) are then emailed from the user's own account.
 */

const RETRY_AFTER_MS = 15 * 60 * 1000
export const MAX_ATTEMPTS = 3

/** What a schedule does when due. Only the desktop app can send, so the web app always reminds. */
export function sendModeOf(schedule: Pick<Schedule, 'sendMode'>): ScheduleSendMode {
  return isTauri() ? (schedule.sendMode ?? 'remind') : 'remind'
}

/** Make the invoice for each schedule that is due and does not just remind. */
async function generateDueInvoices(now: Date): Promise<void> {
  const due = (await db.schedules.toArray()).filter(
    (s) => s.active && sendModeOf(s) !== 'remind' && new Date(s.nextDueDate) <= now,
  )

  for (const schedule of due) {
    try {
      const made = await db.transaction(
        'rw',
        [db.schedules, db.invoices, db.clients, db.templates, db.userProfile, db.appSettings],
        async () => {
          // Read again inside the transaction so a schedule is never used twice
          const fresh = await db.schedules.get(schedule.id)
          if (!fresh || !fresh.active || new Date(fresh.nextDueDate) > now) return null
          const mode = sendModeOf(fresh)
          if (mode === 'remind') return null
          const [client, template] = await Promise.all([
            db.clients.get(fresh.clientId),
            db.templates.get(fresh.templateId),
          ])
          if (!client || !template) return null

          const [profile, settings, invoiceNumber] = await Promise.all([
            profileService.get(),
            settingsService.get(),
            clientService.suggestInvoiceNumber(client.id),
          ])
          const data = invoiceFromTemplate(template, { client, profile, settings, invoiceNumber, today: now })
          const id = await invoiceService.create({
            ...data,
            outbox: {
              state: mode === 'auto' ? 'queued' : 'awaiting-approval',
              scheduleId: fresh.id,
              attempts: 0,
            },
          })
          await db.schedules.update(fresh.id, {
            lastGeneratedDate: now,
            nextDueDate: nextScheduleDate(new Date(fresh.nextDueDate), fresh.frequency, fresh.customIntervalDays, now),
          })
          return id
        },
      )
      if (made) console.info(`Schedule ${schedule.id} made invoice ${made}`)
    } catch (err) {
      console.error('A scheduled invoice could not be made:', err)
    }
  }
}

function readyToSend(invoice: Invoice, now: number): boolean {
  const box = invoice.outbox
  if (!box || invoice.status !== 'draft') return false
  if (box.state === 'queued') return true
  return (
    box.state === 'failed' &&
    box.attempts < MAX_ATTEMPTS &&
    now - (box.lastAttemptAt ?? 0) >= RETRY_AFTER_MS
  )
}

async function sendQueued(): Promise<void> {
  const now = Date.now()
  const waiting = await db.invoices.filter((inv) => readyToSend(inv, now)).toArray()

  for (const candidate of waiting) {
    const invoice = await claimForSending(candidate.id, (inv) => readyToSend(inv, now))
    if (!invoice) continue
    const label = invoice.invoiceNumber || 'An invoice'
    try {
      await deliverInvoice(invoice)
      void nativeNotify('Invoice sent', `${label} was emailed to ${invoice.to.name || invoice.to.email}.`)
    } catch (err) {
      const attempts = (invoice.outbox?.attempts ?? 0) + 1
      await invoiceService.setOutbox(invoice.id, {
        ...invoice.outbox,
        state: 'failed',
        attempts,
        lastAttemptAt: Date.now(),
        error: errorMessage(err),
      })
      // The notification list raises a failure once it stops retrying
      console.error(`${label} was not sent (attempt ${attempts}):`, err)
    }
  }
}

/**
 * A send cut off part way (the app closed or crashed) may or may not have
 * gone out, so it is never retried by itself.
 */
async function recoverInterrupted(): Promise<void> {
  await db.invoices
    .filter((inv) => inv.outbox?.state === 'sending')
    .modify((inv) => {
      inv.outbox = {
        ...inv.outbox!,
        state: 'failed',
        attempts: MAX_ATTEMPTS,
        error: 'Sending was interrupted. Check your Sent folder before trying again.',
      }
    })
}

let running = false
let recovered = false

/** One pass of the outbox. Safe to call often; overlapping calls are skipped. */
export async function runAutoSend(): Promise<void> {
  if (running || !isTauri()) return
  running = true
  try {
    if (!recovered) {
      recovered = true
      await recoverInterrupted()
    }
    await generateDueInvoices(new Date())
    await sendQueued()
  } catch (err) {
    console.error('The outbox could not run:', err)
  } finally {
    running = false
  }
}

/** Queue an invoice to be sent by the outbox from a clean start. */
export async function queueForSending(invoiceId: string): Promise<void> {
  const invoice = await invoiceService.getById(invoiceId)
  if (!invoice || invoice.outbox?.state === 'sending') return
  await invoiceService.setOutbox(invoiceId, {
    scheduleId: invoice.outbox?.scheduleId,
    state: 'queued',
    attempts: 0,
  })
  void runAutoSend()
}
