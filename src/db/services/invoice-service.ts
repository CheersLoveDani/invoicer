import { v4 as uuid } from 'uuid'
import { db } from '@/db/database'
import type { Invoice, InvoiceStatus } from '@/types'

function invoiceTotal(invoice: Invoice): number {
  const lineItemsTotal = invoice.lineItems.reduce(
    (sum, item) => sum + item.price,
    0,
  )
  const expensesTotal = invoice.expenses.reduce(
    (sum, item) => sum + item.price,
    0,
  )
  return lineItemsTotal + expensesTotal
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
    const now = new Date()
    return db.invoices
      .where('status')
      .equals('sent')
      .filter((inv) => inv.dueDate < now)
      .toArray()
  },

  async getRecent(count: number): Promise<Invoice[]> {
    return db.invoices.orderBy('date').reverse().limit(count).toArray()
  },

  async create(data: Omit<Invoice, 'id' | 'createdAt'>): Promise<string> {
    const id = uuid()
    await db.invoices.add({
      ...data,
      id,
      createdAt: new Date(),
    })
    return id
  },

  async update(
    id: string,
    data: Partial<Omit<Invoice, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.invoices.update(id, data)
  },

  async markSent(id: string): Promise<void> {
    await db.invoices.update(id, {
      status: 'sent' as InvoiceStatus,
      sentAt: new Date(),
    })
  },

  async markPaid(id: string): Promise<void> {
    await db.invoices.update(id, {
      status: 'paid' as InvoiceStatus,
      paidAt: new Date(),
    })
  },

  async delete(id: string): Promise<void> {
    await db.invoices.delete(id)
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    await db.invoices.bulkDelete(ids)
  },

  async getStats(): Promise<{
    outstanding: number
    overdue: number
    paidThisMonth: number
    earnedThisYear: number
  }> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const allInvoices = await db.invoices.toArray()

    let outstanding = 0
    let overdue = 0
    let paidThisMonth = 0
    let earnedThisYear = 0

    for (const inv of allInvoices) {
      const total = invoiceTotal(inv)

      if (inv.status === 'sent') {
        outstanding += total
        if (inv.dueDate < now) {
          overdue += total
        }
      }

      if (inv.status === 'paid' && inv.paidAt && inv.paidAt >= startOfMonth) {
        paidThisMonth += total
      }

      if (inv.status === 'paid' && inv.paidAt && inv.paidAt >= startOfYear) {
        earnedThisYear += total
      }
    }

    return { outstanding, overdue, paidThisMonth, earnedThisYear }
  },
}
