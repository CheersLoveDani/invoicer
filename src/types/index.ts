export type Currency = 'GBP' | 'USD' | 'EUR' | 'JPY' | 'CAD' | 'AUD'

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
}

export type LineItemType = 'hourly' | 'fixed' | 'expense' | 'custom'

export interface LineItem {
  id: string
  type: LineItemType
  description: string
  rate?: number
  hours?: number
  price: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export type PdfTemplate = 'clean' | 'modern' | 'compact'

export type ScheduleFrequency = 'weekly' | 'monthly' | 'custom'

export type Theme = 'light' | 'dark' | 'system'

export interface UserProfile {
  id: string // always "user-profile" singleton
  name: string
  email: string
  address: string
  phone: string
  bankAccountName: string
  bankAccountNumber: string
  bankSortCode: string
  bankName: string
  logo?: string // base64 data URL
  defaultCurrency: Currency
}

export interface Client {
  id: string
  name: string
  email: string
  address: string
  invoicePrefix: string
  /** The lowest number the next invoice may take; moves past each number once its invoice is sent. */
  nextInvoiceNumber: number
  notes: string
  emailSubject?: string
  emailBody?: string
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceTemplate {
  id: string
  name: string
  clientId?: string
  title: string
  lineItems: LineItem[]
  expenses: LineItem[]
  notes: string
  paymentReference: string
  pdfTemplate: PdfTemplate
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceFromSnapshot {
  name: string
  email: string
  address: string
  phone: string
}

export interface InvoicePaymentDetails {
  bankAccountName: string
  bankAccountNumber: string
  bankSortCode: string
  bankName: string
  reference: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  title: string
  status: InvoiceStatus
  date: Date
  dueDate: Date
  from: InvoiceFromSnapshot
  to: InvoiceFromSnapshot
  lineItems: LineItem[]
  expenses: LineItem[]
  notes: string
  paymentDetails: InvoicePaymentDetails
  currency: Currency
  pdfTemplate: PdfTemplate
  templateId?: string
  clientId?: string
  createdAt: Date
  sentAt?: Date
  paidAt?: Date
}

export interface Schedule {
  id: string
  clientId: string
  templateId: string
  frequency: ScheduleFrequency
  customIntervalDays?: number
  nextDueDate: Date
  lastGeneratedDate?: Date
  active: boolean
}

export interface AppSettings {
  id: string // always "app-settings" singleton
  theme: Theme
  defaultDueDays: number
  defaultPdfTemplate: PdfTemplate
  lastBackupDate?: Date
  backupReminderDays: number
}
