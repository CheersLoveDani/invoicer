import { v4 as uuid } from 'uuid'
import { db } from '@/db/database'
import type { Client } from '@/types'

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

  async delete(id: string): Promise<void> {
    await db.clients.delete(id)
  },

  async incrementInvoiceNumber(id: string): Promise<string> {
    const client = await db.clients.get(id)
    if (!client) {
      throw new Error(`Client not found: ${id}`)
    }
    const number = client.nextInvoiceNumber
    const formatted = `${client.invoicePrefix}${String(number).padStart(4, '0')}`
    await db.clients.update(id, {
      nextInvoiceNumber: number + 1,
      updatedAt: new Date(),
    })
    return formatted
  },
}
