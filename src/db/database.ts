import Dexie, { type EntityTable } from 'dexie'
import type {
  UserProfile,
  Client,
  InvoiceTemplate,
  Invoice,
  Schedule,
  AppSettings,
} from '@/types'
import {
  invoiceBelongsTo,
  lastUsedNumber,
  parseInvoiceNumber,
} from '@/db/services/invoice-numbering'

export class InvoicerDB extends Dexie {
  userProfile!: EntityTable<UserProfile, 'id'>
  clients!: EntityTable<Client, 'id'>
  templates!: EntityTable<InvoiceTemplate, 'id'>
  invoices!: EntityTable<Invoice, 'id'>
  schedules!: EntityTable<Schedule, 'id'>
  appSettings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('invoicer')
    this.version(1).stores({
      userProfile: 'id',
      clients: 'id, name, email, invoicePrefix',
      templates: 'id, name, clientId',
      invoices:
        'id, invoiceNumber, status, date, dueDate, currency, templateId, [status+dueDate]',
      schedules: 'id, clientId, templateId, nextDueDate, active',
      appSettings: 'id',
    })

    // Invoices remember their client, and each client's next number is reset
    // to follow the last invoice actually sent: numbers used to be taken as
    // soon as an invoice was opened, so unsent drafts had pushed them ahead.
    this.version(2)
      .stores({
        invoices:
          'id, invoiceNumber, status, date, dueDate, currency, templateId, clientId, [status+dueDate]',
      })
      .upgrade(async (tx) => {
        // Backups restored by older versions left dates stored as strings
        const revive = (row: Record<string, unknown>, fields: string[]) => {
          for (const f of fields) if (typeof row[f] === 'string') row[f] = new Date(row[f] as string)
        }
        await tx.table('invoices').toCollection().modify((inv) =>
          revive(inv, ['date', 'dueDate', 'sentAt', 'paidAt', 'createdAt']),
        )
        await tx.table('schedules').toCollection().modify((s) =>
          revive(s, ['nextDueDate', 'lastGeneratedDate']),
        )
        await tx.table('clients').toCollection().modify((c) => revive(c, ['createdAt', 'updatedAt']))
        await tx.table('templates').toCollection().modify((t) => revive(t, ['createdAt', 'updatedAt']))
        await tx.table('appSettings').toCollection().modify((a) => revive(a, ['lastBackupDate']))
        await reconcileInvoiceNumbers(tx.table('clients'), tx.table('invoices'))
      })
  }
}

/**
 * Links invoices to their clients and resets each client's next number to
 * follow the last invoice actually sent (or the lowest draft, if none was).
 */
interface Store<T> {
  toArray(): Promise<T[]>
  update(key: string, changes: Partial<T>): Promise<number>
}

export async function reconcileInvoiceNumbers(
  clientTable: Store<Client>,
  invoiceTable: Store<Invoice>,
): Promise<void> {
  const clients = await clientTable.toArray()
  const all = await invoiceTable.toArray()

  for (const invoice of all) {
    if (invoice.clientId) continue
    const owner = clients.find((c) => invoiceBelongsTo(c, invoice))
    if (owner) {
      invoice.clientId = owner.id
      await invoiceTable.update(invoice.id, { clientId: owner.id })
    }
  }

  for (const client of clients) {
    const mine = all.filter((inv) => inv.clientId === client.id)
    if (mine.length === 0) continue
    const last = lastUsedNumber(client, mine)
    const numbers = mine
      .map((inv) => parseInvoiceNumber(client.invoicePrefix, inv.invoiceNumber))
      .filter((n): n is number => n !== null)
    const next = last !== null ? last + 1 : numbers.length > 0 ? Math.min(...numbers) : null
    if (next !== null && next !== client.nextInvoiceNumber) {
      await clientTable.update(client.id, { nextInvoiceNumber: next })
    }
  }
}

export const db = new InvoicerDB()
