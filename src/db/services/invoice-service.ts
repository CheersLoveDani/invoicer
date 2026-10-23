import { v4 as uuid } from 'uuid'
import { db } from '@/db/database'
import { clientService } from '@/db/services/client-service'
import { invoiceTotal, isOverdue } from '@/lib/invoice-amounts'
import type { Currency, Invoice, InvoiceStatus } from '@/types'

async function recordUsed(id: string): Promise<void> {
  const invoice = await db.invoices.get(id)
  if (invoice) await clientService.recordNumberUsed(invoice)
}

export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    return db.invoices.toArray()
  },

  async getById(id: string): Promise<Invoice | undefined> {
    return db.invoices.get(id)
  },

  async getByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    return db.invoices.where('status').equals(status).toArray()
  },

  async getOverdue(): Promise<Invoice[]> {
    return db.invoices
      .where('status')
      .equals('sent')
      .filter((inv) => isOverdue(inv))
      .toArray()
  },

  async getRecent(count: number): Promise<Invoice[]> {
    return db.invoices.orderBy('date').reverse().limit(count).toArray()
  },

  async create(data: Omit<Invoice, 'id' | 'createdAt'>): Promise<string> {
    const id = uuid()
    const invoice: Invoice = { ...data, id, createdAt: new Date() }
    await db.invoices.add(invoice)
    await clientService.recordNumberUsed(invoice)
    return id
  },

  async update(
    id: string,
    data: Partial<Omit<Invoice, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.invoices.update(id, data)
    await recordUsed(id)
  },

  async markSent(id: string): Promise<void> {
    const existing = await db.invoices.get(id)
    // A paid invoice stays paid
    if (!existing || existing.status !== 'draft') return
    await db.invoices.update(id, {
      status: 'sent' as InvoiceStatus,
      sentAt: new Date(),
    })
    await recordUsed(id)
  },

  async markPaid(id: string): Promise<void> {
    const existing = await db.invoices.get(id)
    if (!existing || existing.status === 'paid') return
    await db.invoices.update(id, {
      status: 'paid' as InvoiceStatus,
      paidAt: new Date(),
    })
    await recordUsed(id)
  },

  async delete(id: string): Promise<void> {
    await db.invoices.delete(id)
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    await db.invoices.bulkDelete(ids)
  },

  /** Totals in one currency; invoices in other currencies are counted, not summed in. */
  async getStats(currency: Currency): Promise<{
    outstanding: number
    outstandingCount: number
    overdue: number
    overdueCount: number
    paidThisMonth: number
    earnedThisYear: number
    otherCurrencyCount: number
  }> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const stats = {
      outstanding: 0,
      outstandingCount: 0,
      overdue: 0,
      overdueCount: 0,
      paidThisMonth: 0,
      earnedThisYear: 0,
      otherCurrencyCount: 0,
    }

    for (const inv of await db.invoices.toArray()) {
      if (inv.status === 'draft') continue
      if (inv.currency !== currency) {
        stats.otherCurrencyCount++
        continue
      }
      const total = invoiceTotal(inv)
      if (inv.status === 'sent') {
        stats.outstanding += total
        stats.outstandingCount++
        if (isOverdue(inv, now)) {
          stats.overdue += total
          stats.overdueCount++
        }
      }
      const paidAt = inv.paidAt ? new Date(inv.paidAt) : null
      if (inv.status === 'paid' && paidAt) {
        if (paidAt >= startOfMonth) stats.paidThisMonth += total
        if (paidAt >= startOfYear) stats.earnedThisYear += total
      }
    }

    return stats
  },
}
