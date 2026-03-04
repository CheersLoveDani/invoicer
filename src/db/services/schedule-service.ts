import { v4 as uuid } from 'uuid'
import { db } from '@/db/database'
import type { Schedule } from '@/types'

export const scheduleService = {
  async getAll(): Promise<Schedule[]> {
    return db.schedules.toArray()
  },

  async getActive(): Promise<Schedule[]> {
    return db.schedules.where('active').equals(1).toArray()
  },

  async getDueSoon(withinDays: number): Promise<Schedule[]> {
    const now = new Date()
    const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)
    return db.schedules
      .where('active')
      .equals(1)
      .filter((s) => s.nextDueDate <= cutoff)
      .toArray()
  },

  async create(data: Omit<Schedule, 'id'>): Promise<string> {
    const id = uuid()
    await db.schedules.add({ ...data, id })
    return id
  },

  async update(
    id: string,
    data: Partial<Omit<Schedule, 'id'>>,
  ): Promise<void> {
    await db.schedules.update(id, data)
  },

  async delete(id: string): Promise<void> {
    await db.schedules.delete(id)
  },
}
