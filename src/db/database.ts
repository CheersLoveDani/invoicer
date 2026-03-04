import Dexie, { type EntityTable } from 'dexie'
import type {
  UserProfile,
  Client,
  InvoiceTemplate,
  Invoice,
  Schedule,
  AppSettings,
} from '@/types'

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
  }
}

export const db = new InvoicerDB()
