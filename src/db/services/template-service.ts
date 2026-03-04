import { v4 as uuid } from 'uuid'
import { db } from '@/db/database'
import type { InvoiceTemplate } from '@/types'

export const templateService = {
  async getAll(): Promise<InvoiceTemplate[]> {
    return db.templates.toArray()
  },

  async getById(id: string): Promise<InvoiceTemplate | undefined> {
    return db.templates.get(id)
  },

  async getByClientId(clientId: string): Promise<InvoiceTemplate[]> {
    return db.templates.where('clientId').equals(clientId).toArray()
  },

  async create(
    data: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const id = uuid()
    const now = new Date()
    await db.templates.add({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    })
    return id
  },

  async update(
    id: string,
    data: Partial<Omit<InvoiceTemplate, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.templates.update(id, { ...data, updatedAt: new Date() })
  },

  async delete(id: string): Promise<void> {
    await db.templates.delete(id)
  },
}
