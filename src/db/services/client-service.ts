import { v4 as uuid } from 'uuid'
import { db } from '@/db/database'
import type { Client, Invoice } from '@/types'
import {
  invoiceBelongsTo,
  isNumberUsed,
  parseInvoiceNumber,
  suggestNextNumber,
} from '@/db/services/invoice-numbering'

export const clientService = {
  async getAll(): Promise<Client[]> {
    return db.clients.toArray()
  },

  async getById(id: string): Promise<Client | undefined> {
    return db.clients.get(id)
  },

  async search(query: string): Promise<Client[]> {
    const lower = query.toLowerCase()
    return db.clients
      .filter(
        (client) =>
          client.name.toLowerCase().includes(lower) ||
          client.email.toLowerCase().includes(lower),
      )
      .toArray()
  },

  async create(
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const id = uuid()
    const now = new Date()
    await db.clients.add({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    })
    return id
  },

  async update(
    id: string,
    data: Partial<Omit<Client, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.clients.update(id, { ...data, updatedAt: new Date() })
  },

  /** Removes the client and its schedules; its templates stay, unlinked. Invoices keep their snapshot. */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.clients, db.schedules, db.templates, async () => {
      await db.schedules.where('clientId').equals(id).delete()
      await db.templates.where('clientId').equals(id).modify({ clientId: undefined })
      await db.clients.delete(id)
    })
  },

  /** The invoice number to offer for a new invoice. Reserves nothing. */
  async suggestInvoiceNumber(id: string, excludeInvoiceId?: string): Promise<string> {
    const client = await db.clients.get(id)
    if (!client) {
      throw new Error(`Client not found: ${id}`)
    }
    const invoices = await db.invoices.toArray()
    return suggestNextNumber(client, invoices, excludeInvoiceId)
  },

  /** The client a stored invoice was billed to, including invoices made before clientId was stored. */
  async findForInvoice(invoice: Invoice): Promise<Client | undefined> {
    if (invoice.clientId) return db.clients.get(invoice.clientId)
    const clients = await db.clients.toArray()
    return clients.find((client) => invoiceBelongsTo(client, invoice))
  },

  /** Once an invoice is sent or paid, the client's sequence moves past its number. */
  async recordNumberUsed(invoice: Invoice): Promise<void> {
    if (!isNumberUsed(invoice)) return
    const client = await clientService.findForInvoice(invoice)
    if (!client) return
    const n = parseInvoiceNumber(client.invoicePrefix, invoice.invoiceNumber)
    if (n === null || n < client.nextInvoiceNumber) return
    await db.clients.update(client.id, { nextInvoiceNumber: n + 1, updatedAt: new Date() })
  },
}
