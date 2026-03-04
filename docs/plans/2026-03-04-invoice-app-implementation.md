# Invoice App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-user, local-first invoice webapp with client presets, recurring schedules, PDF generation, email drafting, and a tracking dashboard.

**Architecture:** React SPA with Dexie.js for IndexedDB storage, @react-pdf/renderer for PDF generation, Recharts for interactive graphs. Data access abstracted behind a service layer for future Tauri migration. All state in IndexedDB, no backend.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Dexie.js, @react-pdf/renderer, Recharts, React Router, date-fns, uuid

---

## Phase 1: Project Scaffolding & Foundation

### Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Step 1: Scaffold with Vite**

Run:
```bash
cd invoicer
npm create vite@latest . -- --template react-ts
```

If prompted about non-empty directory, proceed (only docs/ exists).

**Step 2: Install core dependencies**

Run:
```bash
npm install
npm install react-router-dom dexie dexie-react-hooks @react-pdf/renderer recharts date-fns uuid
npm install -D @types/uuid
```

**Step 3: Verify it runs**

Run: `npm run dev`
Expected: Vite dev server starts, default React page renders at localhost:5173

**Step 4: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project with dependencies"
```

---

### Task 2: Set up Tailwind CSS + shadcn/ui

**Files:**
- Modify: `package.json`, `tsconfig.json`, `vite.config.ts`
- Create: `src/index.css`, `components.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `src/lib/utils.ts`

**Step 1: Install Tailwind**

Run:
```bash
npm install -D tailwindcss @tailwindcss/vite
```

**Step 2: Configure Tailwind in Vite**

Update `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Update `src/index.css` to include:
```css
@import "tailwindcss";
```

**Step 3: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init
```

Choose: TypeScript, Default style, Neutral base color, CSS variables. This creates `components.json` and sets up the `src/components/ui/` directory.

**Step 4: Install initial shadcn components we'll need**

Run:
```bash
npx shadcn@latest add button input label card table dialog select textarea badge tabs separator dropdown-menu tooltip popover calendar command sheet avatar switch scroll-area
```

**Step 5: Verify Tailwind + shadcn work**

Update `src/App.tsx`:
```tsx
import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="p-8">
      <Button>Test</Button>
    </div>
  )
}
export default App
```

Run: `npm run dev`
Expected: Styled button renders correctly

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind CSS and shadcn/ui"
```

---

### Task 3: Set up TypeScript types and data model

**Files:**
- Create: `src/types/index.ts`

**Step 1: Define all types**

Create `src/types/index.ts`:
```ts
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
  nextInvoiceNumber: number
  notes: string
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
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: define TypeScript types for all data models"
```

---

### Task 4: Set up Dexie.js database and service layer

**Files:**
- Create: `src/db/database.ts`
- Create: `src/db/services/profile-service.ts`
- Create: `src/db/services/client-service.ts`
- Create: `src/db/services/template-service.ts`
- Create: `src/db/services/invoice-service.ts`
- Create: `src/db/services/schedule-service.ts`
- Create: `src/db/services/settings-service.ts`
- Create: `src/db/index.ts`

**Step 1: Create the Dexie database**

Create `src/db/database.ts`:
```ts
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
      invoices: 'id, invoiceNumber, status, date, dueDate, currency, templateId, [status+dueDate]',
      schedules: 'id, clientId, templateId, nextDueDate, active',
      appSettings: 'id',
    })
  }
}

export const db = new InvoicerDB()
```

**Step 2: Create service layer**

Create each service file. These abstract DB operations so a Tauri backend could replace them later. Each service is an object with async methods.

`src/db/services/profile-service.ts`:
```ts
import { db } from '../database'
import type { UserProfile, Currency } from '@/types'

const PROFILE_ID = 'user-profile'

const defaultProfile: UserProfile = {
  id: PROFILE_ID,
  name: '',
  email: '',
  address: '',
  phone: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankSortCode: '',
  bankName: '',
  defaultCurrency: 'GBP',
}

export const profileService = {
  async get(): Promise<UserProfile> {
    const profile = await db.userProfile.get(PROFILE_ID)
    return profile ?? defaultProfile
  },

  async save(profile: Partial<UserProfile>): Promise<void> {
    await db.userProfile.put({ ...defaultProfile, ...profile, id: PROFILE_ID })
  },
}
```

`src/db/services/client-service.ts`:
```ts
import { db } from '../database'
import type { Client } from '@/types'
import { v4 as uuid } from 'uuid'

export const clientService = {
  async getAll(): Promise<Client[]> {
    return db.clients.orderBy('name').toArray()
  },

  async getById(id: string): Promise<Client | undefined> {
    return db.clients.get(id)
  },

  async search(query: string): Promise<Client[]> {
    const lower = query.toLowerCase()
    return db.clients
      .filter(c => c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower))
      .toArray()
  },

  async create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const client: Client = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.clients.add(client)
    return client
  },

  async update(id: string, data: Partial<Client>): Promise<void> {
    await db.clients.update(id, { ...data, updatedAt: new Date() })
  },

  async delete(id: string): Promise<void> {
    await db.clients.delete(id)
  },

  async incrementInvoiceNumber(id: string): Promise<string> {
    const client = await db.clients.get(id)
    if (!client) throw new Error('Client not found')
    const num = client.nextInvoiceNumber
    await db.clients.update(id, { nextInvoiceNumber: num + 1 })
    return `${client.invoicePrefix}${num}`
  },
}
```

`src/db/services/template-service.ts`:
```ts
import { db } from '../database'
import type { InvoiceTemplate } from '@/types'
import { v4 as uuid } from 'uuid'

export const templateService = {
  async getAll(): Promise<InvoiceTemplate[]> {
    return db.templates.orderBy('name').toArray()
  },

  async getById(id: string): Promise<InvoiceTemplate | undefined> {
    return db.templates.get(id)
  },

  async getByClientId(clientId: string): Promise<InvoiceTemplate[]> {
    return db.templates.where('clientId').equals(clientId).toArray()
  },

  async create(data: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvoiceTemplate> {
    const template: InvoiceTemplate = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.templates.add(template)
    return template
  },

  async update(id: string, data: Partial<InvoiceTemplate>): Promise<void> {
    await db.templates.update(id, { ...data, updatedAt: new Date() })
  },

  async delete(id: string): Promise<void> {
    await db.templates.delete(id)
  },
}
```

`src/db/services/invoice-service.ts`:
```ts
import { db } from '../database'
import type { Invoice, InvoiceStatus } from '@/types'
import { v4 as uuid } from 'uuid'

export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    return db.invoices.orderBy('date').reverse().toArray()
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
      .where('status').equals('sent')
      .filter(inv => inv.dueDate < now)
      .toArray()
  },

  async getRecent(count: number = 20): Promise<Invoice[]> {
    return db.invoices.orderBy('createdAt').reverse().limit(count).toArray()
  },

  async create(data: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const invoice: Invoice = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
    }
    await db.invoices.add(invoice)
    return invoice
  },

  async update(id: string, data: Partial<Invoice>): Promise<void> {
    await db.invoices.update(id, data)
  },

  async markSent(id: string): Promise<void> {
    await db.invoices.update(id, { status: 'sent', sentAt: new Date() })
  },

  async markPaid(id: string): Promise<void> {
    await db.invoices.update(id, { status: 'paid', paidAt: new Date() })
  },

  async delete(id: string): Promise<void> {
    await db.invoices.delete(id)
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    await db.invoices.bulkDelete(ids)
  },

  async getStats() {
    const all = await db.invoices.toArray()
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    const outstanding = all
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + i.lineItems.reduce((s, li) => s + li.price, 0) + i.expenses.reduce((s, e) => s + e.price, 0), 0)

    const overdue = all
      .filter(i => i.status === 'sent' && i.dueDate < now)
      .reduce((sum, i) => sum + i.lineItems.reduce((s, li) => s + li.price, 0) + i.expenses.reduce((s, e) => s + e.price, 0), 0)

    const paidThisMonth = all
      .filter(i => i.status === 'paid' && i.paidAt && i.paidAt >= thisMonth)
      .reduce((sum, i) => sum + i.lineItems.reduce((s, li) => s + li.price, 0) + i.expenses.reduce((s, e) => s + e.price, 0), 0)

    const earnedThisYear = all
      .filter(i => i.status === 'paid' && i.paidAt && i.paidAt >= thisYear)
      .reduce((sum, i) => sum + i.lineItems.reduce((s, li) => s + li.price, 0) + i.expenses.reduce((s, e) => s + e.price, 0), 0)

    return { outstanding, overdue, paidThisMonth, earnedThisYear }
  },
}
```

`src/db/services/schedule-service.ts`:
```ts
import { db } from '../database'
import type { Schedule } from '@/types'
import { v4 as uuid } from 'uuid'

export const scheduleService = {
  async getAll(): Promise<Schedule[]> {
    return db.schedules.toArray()
  },

  async getActive(): Promise<Schedule[]> {
    return db.schedules.where('active').equals(1).toArray()
  },

  async getDueSoon(withinDays: number = 7): Promise<Schedule[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + withinDays)
    return db.schedules
      .where('active').equals(1)
      .filter(s => s.nextDueDate <= cutoff)
      .toArray()
  },

  async create(data: Omit<Schedule, 'id'>): Promise<Schedule> {
    const schedule: Schedule = { ...data, id: uuid() }
    await db.schedules.add(schedule)
    return schedule
  },

  async update(id: string, data: Partial<Schedule>): Promise<void> {
    await db.schedules.update(id, data)
  },

  async delete(id: string): Promise<void> {
    await db.schedules.delete(id)
  },
}
```

`src/db/services/settings-service.ts`:
```ts
import { db } from '../database'
import type { AppSettings } from '@/types'

const SETTINGS_ID = 'app-settings'

const defaultSettings: AppSettings = {
  id: SETTINGS_ID,
  theme: 'system',
  defaultDueDays: 30,
  defaultPdfTemplate: 'clean',
  backupReminderDays: 30,
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    const settings = await db.appSettings.get(SETTINGS_ID)
    return settings ?? defaultSettings
  },

  async save(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.get()
    await db.appSettings.put({ ...current, ...settings, id: SETTINGS_ID })
  },
}
```

`src/db/index.ts`:
```ts
export { db } from './database'
export { profileService } from './services/profile-service'
export { clientService } from './services/client-service'
export { templateService } from './services/template-service'
export { invoiceService } from './services/invoice-service'
export { scheduleService } from './services/schedule-service'
export { settingsService } from './services/settings-service'
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: Builds successfully with no type errors

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: set up Dexie.js database with service layer for all data models"
```

---

### Task 5: Set up routing and app shell with sidebar

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/top-bar.tsx`
- Create: `src/components/layout/app-layout.tsx`
- Create: `src/pages/dashboard.tsx`
- Create: `src/pages/invoices.tsx`
- Create: `src/pages/invoice-editor.tsx`
- Create: `src/pages/clients.tsx`
- Create: `src/pages/settings.tsx`
- Modify: `src/App.tsx`
- Create: `src/hooks/use-theme.ts`

**Step 1: Create theme hook**

`src/hooks/use-theme.ts`:
```ts
import { useEffect, useState } from 'react'
import { settingsService } from '@/db'
import type { Theme } from '@/types'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    settingsService.get().then(s => setThemeState(s.theme))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme

    root.classList.toggle('dark', resolved === 'dark')
  }, [theme])

  const setTheme = async (t: Theme) => {
    setThemeState(t)
    await settingsService.save({ theme: t })
  }

  return { theme, setTheme }
}
```

**Step 2: Create sidebar component**

`src/components/layout/sidebar.tsx` — Sidebar with icons and labels for: Dashboard (LayoutDashboard icon), Invoices (FileText), New Invoice (PlusCircle), Clients & Templates (Users), Settings (Settings). Use lucide-react for icons. Collapsible on small screens. Active page highlighted. Include notification badge count placeholder.

Install lucide-react:
```bash
npm install lucide-react
```

**Step 3: Create top bar**

`src/components/layout/top-bar.tsx` — Shows page title on left, theme toggle (sun/moon icon) on right. Uses the `useTheme` hook.

**Step 4: Create app layout wrapper**

`src/components/layout/app-layout.tsx` — Flexbox: sidebar on left, main content area on right (with top bar above content). Content area scrollable.

**Step 5: Create placeholder pages**

Each page file (`src/pages/dashboard.tsx`, etc.) exports a component with just a heading for now:
```tsx
export default function DashboardPage() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Dashboard</h1></div>
}
```

**Step 6: Wire up routing in App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import DashboardPage from '@/pages/dashboard'
import InvoicesPage from '@/pages/invoices'
import InvoiceEditorPage from '@/pages/invoice-editor'
import ClientsPage from '@/pages/clients'
import SettingsPage from '@/pages/settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceEditorPage />} />
          <Route path="/invoices/:id" element={<InvoiceEditorPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

**Step 7: Verify navigation works**

Run: `npm run dev`
Expected: Sidebar renders, clicking nav items changes pages, theme toggle works

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add app shell with sidebar navigation, routing, and theme toggle"
```

---

## Phase 2: Settings & Profile

### Task 6: Build the Settings page

**Files:**
- Modify: `src/pages/settings.tsx`
- Create: `src/components/settings/profile-form.tsx`
- Create: `src/components/settings/preferences-form.tsx`
- Create: `src/components/settings/data-management.tsx`
- Create: `src/components/settings/logo-upload.tsx`

**Step 1: Build logo upload component**

`src/components/settings/logo-upload.tsx` — Drag-and-drop zone + file picker button. Accepts PNG/JPG/SVG. Converts to base64 data URL on upload. Shows preview of current logo. "Remove logo" button. Max file size: 2MB with validation.

**Step 2: Build profile form**

`src/components/settings/profile-form.tsx` — Form with shadcn inputs for all UserProfile fields. Uses `profileService.get()` to load, `profileService.save()` to persist. Logo upload component embedded. Currency selector dropdown. Save button with success toast.

Use `dexie-react-hooks` `useLiveQuery` to reactively load profile data.

**Step 3: Build preferences form**

`src/components/settings/preferences-form.tsx` — Theme selector (3 radio buttons or select), default due days (number input), default PDF template (select: clean/modern/compact), backup reminder interval (number input, 0 to disable).

**Step 4: Build data management section**

`src/components/settings/data-management.tsx`:
- "Export All Data" button: queries all tables, bundles into a single JSON object, triggers file download as `invoicer-backup-YYYY-MM-DD.json`
- "Import Data" button: file picker for JSON, parses and validates structure, shows preview dialog of what will be imported (counts: X clients, Y invoices, etc.), confirm to import
- "Export All Invoices as PDFs" button: placeholder for now (implemented after PDF generation in Phase 4)
- Shows last backup date

**Step 5: Compose settings page**

`src/pages/settings.tsx` — Tabs component with 3 tabs: Profile, Preferences, Data. Each tab renders the corresponding form component.

**Step 6: Verify settings page**

Run: `npm run dev`, navigate to Settings. Fill in profile details, change theme, save. Refresh page — data persists.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: build settings page with profile, preferences, and data management"
```

---

## Phase 3: Clients & Templates

### Task 7: Build Clients management

**Files:**
- Modify: `src/pages/clients.tsx`
- Create: `src/components/clients/client-list.tsx`
- Create: `src/components/clients/client-card.tsx`
- Create: `src/components/clients/client-form-dialog.tsx`

**Step 1: Build client form dialog**

`src/components/clients/client-form-dialog.tsx` — shadcn Dialog with form fields: name, email, address (textarea), invoice prefix, starting invoice number (default 1), internal notes. Works for both create and edit (pass existing client as prop). On save, calls `clientService.create()` or `clientService.update()`.

**Step 2: Build client card**

`src/components/clients/client-card.tsx` — shadcn Card showing client name, email, prefix, invoice count (from related invoices). Action buttons: Edit, Delete (with confirmation dialog). Click card body to expand showing address, notes, and linked templates.

**Step 3: Build client list**

`src/components/clients/client-list.tsx` — Uses `useLiveQuery` from dexie-react-hooks to reactively list all clients. Search bar at top (filters by name/email). "Add Client" button opens form dialog. Renders grid of client cards.

**Step 4: Wire into clients page**

`src/pages/clients.tsx` — Tabs: "Clients" and "Templates" (templates tab built in next task). Clients tab renders `ClientList`.

**Step 5: Verify**

Run: `npm run dev`. Add a client, edit it, delete it. Search works. Data persists on refresh.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: build client management with CRUD, search, and card view"
```

---

### Task 8: Build Templates management

**Files:**
- Create: `src/components/templates/template-list.tsx`
- Create: `src/components/templates/template-card.tsx`
- Create: `src/components/templates/template-form-dialog.tsx`
- Create: `src/components/line-items/line-item-editor.tsx`

**Step 1: Build line item editor component**

`src/components/line-items/line-item-editor.tsx` — Reusable component (shared between template form and invoice editor later). Renders a list of line items with:
- "Add Item" button with type selector dropdown (Hourly, Fixed, Expense, Custom)
- Each row shows fields based on type: Hourly = description + rate + hours + auto-calculated price. Fixed = description + price. Expense = description + cost. Custom = description + amount.
- Delete button per row
- Drag handle for reordering (use @dnd-kit/core for drag and drop)
- Subtotal displayed at bottom

Install:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Build template form dialog**

`src/components/templates/template-form-dialog.tsx` — Larger dialog (or sheet) with: template name, linked client (optional select from saved clients), invoice title, line items editor, expenses editor (same component, filtered to expense type), default notes/payment terms textarea, payment reference field, PDF template selector. Save calls `templateService.create()` or `templateService.update()`.

**Step 3: Build template card and list**

Similar pattern to clients. Card shows template name, linked client (if any), item count. List has search and "Add Template" button.

**Step 4: Add templates tab to clients page**

Update `src/pages/clients.tsx` to include Templates tab rendering `TemplateList`.

**Step 5: Verify**

Create a template with various line item types, edit it, delete it. Verify drag reordering works.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: build template management with line item editor and drag-reorder"
```

---

## Phase 4: Invoice Creation & PDF

### Task 9: Build the Invoice Editor form

**Files:**
- Modify: `src/pages/invoice-editor.tsx`
- Create: `src/components/invoice/invoice-form.tsx`
- Create: `src/components/invoice/client-picker.tsx`
- Create: `src/components/invoice/invoice-actions.tsx`
- Create: `src/hooks/use-invoice-form.ts`

**Step 1: Build client picker**

`src/components/invoice/client-picker.tsx` — Command/combobox component (shadcn Command). Type to search clients. Selecting a client fills in the To fields and generates invoice number from their prefix. "Manual entry" option to type client details directly instead.

**Step 2: Build invoice form hook**

`src/hooks/use-invoice-form.ts` — Custom hook managing all form state. Initializes from:
- Blank: empty form, date = today, loads user profile into "from" fields
- Template: loads template data, fills matching fields
- Client: fills client details, generates invoice number
- Duplicate: copies existing invoice, new date, incremented number
- Edit: loads existing invoice by ID

Provides: form state, setters for each section, computed total, validation, save/update functions.

**Step 3: Build invoice form**

`src/components/invoice/invoice-form.tsx` — Single scrollable form with sections:
1. Header: title input, date picker (shadcn Calendar in Popover), invoice number input, due date picker
2. Client section: client picker + manual fields (name, email, address)
3. Line items: reuses `LineItemEditor` from Task 8
4. Expenses: same `LineItemEditor` filtered to expenses
5. Notes & payment terms: textarea
6. Payment details: pre-filled from profile, reference field editable
7. Currency selector, PDF template selector

**Step 4: Build invoice actions bar**

`src/components/invoice/invoice-actions.tsx` — Sticky bottom bar with buttons: Save as Draft, Download PDF (placeholder), Send Invoice (placeholder), Save as Template. Each calls the appropriate service method.

**Step 5: Wire into page with two-panel layout**

`src/pages/invoice-editor.tsx` — Left panel: `InvoiceForm`. Right panel: placeholder "PDF Preview" area (built in next task). Reads URL params for mode: `/invoices/new`, `/invoices/new?template=ID`, `/invoices/new?client=ID`, `/invoices/new?duplicate=ID`, `/invoices/:id` for edit.

**Step 6: Verify form**

Run: `npm run dev`. Create invoice from blank, from client, from template. Save as draft. Edit saved invoice. All fields populate and persist correctly.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: build invoice editor form with client picker and line items"
```

---

### Task 10: Build PDF generation with @react-pdf/renderer

**Files:**
- Create: `src/components/pdf/pdf-clean.tsx`
- Create: `src/components/pdf/pdf-modern.tsx`
- Create: `src/components/pdf/pdf-compact.tsx`
- Create: `src/components/pdf/pdf-document.tsx`
- Create: `src/components/pdf/pdf-preview.tsx`
- Create: `src/lib/pdf-utils.ts`

**Step 1: Create shared PDF utilities**

`src/lib/pdf-utils.ts` — Helper functions: `formatCurrency(amount, currency)`, `calculateTotal(lineItems, expenses)`, `formatDate(date)`. These are used by all PDF templates.

**Step 2: Build Clean PDF template**

`src/components/pdf/pdf-clean.tsx` — Uses `@react-pdf/renderer` components (Document, Page, View, Text, StyleSheet). Matches the style of the user's existing invoices:
- Title at top (bold, large)
- Date and invoice number below
- "From:" table with name, email, address
- "To:" table with client details
- "Work" section: table with Description, Rate, Hours, Price columns (for hourly items), or just Description and Price
- Expenses section below (if any): Description and Cost
- Total row (bold)
- Notes/payment terms text
- Payment details table: A/C name, number, sort code, bank, reference

Register fonts if needed. Use StyleSheet.create for all styles. Ensure proper table layouts with flex.

**Step 3: Build Modern PDF template**

`src/components/pdf/pdf-modern.tsx` — Similar content but with:
- Accent color bar across top of page (configurable via prop)
- Logo in top-right corner (if provided)
- More whitespace between sections
- Slightly rounded visual style (simulated with background colors on rows)
- Section headers with accent color

**Step 4: Build Compact PDF template**

`src/components/pdf/pdf-compact.tsx` — Same content but:
- Smaller font sizes (9-10pt vs 11-12pt)
- Tighter margins and padding
- Denser table rows
- Fits more content per page

**Step 5: Build PDF document selector**

`src/components/pdf/pdf-document.tsx` — Takes invoice data + template choice as props, renders the correct template component. Wraps in `<Document>` if needed.

**Step 6: Build live PDF preview panel**

`src/components/pdf/pdf-preview.tsx` — Uses `@react-pdf/renderer`'s `PDFViewer` component for the in-editor preview. Receives invoice form state as props, re-renders on every change (debounced at 500ms to avoid lag). Includes zoom controls and page navigation for multi-page invoices.

**Step 7: Wire preview into invoice editor**

Update `src/pages/invoice-editor.tsx` to render `PdfPreview` in the right panel, passing current form state. On smaller screens, show a "Preview" toggle button that opens it as a sheet/overlay.

**Step 8: Implement Download PDF action**

Update invoice actions: "Download PDF" uses `@react-pdf/renderer`'s `pdf()` function to generate a blob, creates an object URL, triggers download as `Invoice-{number}-{date}.pdf`.

**Step 9: Verify PDF generation**

Run: `npm run dev`. Create an invoice with various line items. Preview updates live. Download PDF — opens correctly in PDF viewer. Test all 3 templates. Test with and without logo.

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: build PDF generation with 3 templates and live preview"
```

---

### Task 11: Build email flow and draggable PDF

**Files:**
- Create: `src/lib/email-utils.ts`
- Create: `src/components/invoice/pdf-drag-card.tsx`
- Modify: `src/components/invoice/invoice-actions.tsx`

**Step 1: Create email utilities**

`src/lib/email-utils.ts`:
```ts
import type { Invoice } from '@/types'
import { CURRENCY_SYMBOLS } from '@/types'

export function generateMailtoLink(invoice: Invoice, fromName: string): string {
  const total = [...invoice.lineItems, ...invoice.expenses].reduce((sum, li) => sum + li.price, 0)
  const symbol = CURRENCY_SYMBOLS[invoice.currency]

  const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} — ${fromName}`)
  const body = encodeURIComponent(
    `Dear ${invoice.to.name},\n\n` +
    `Please find attached invoice ${invoice.invoiceNumber} for ${symbol}${total.toFixed(2)} for ${invoice.title}.\n\n` +
    `${invoice.notes ? invoice.notes + '\n\n' : ''}` +
    `Kind regards,\n${fromName}`
  )

  return `mailto:${invoice.to.email}?subject=${subject}&body=${body}`
}
```

**Step 2: Build draggable PDF card**

`src/components/invoice/pdf-drag-card.tsx` — After PDF generation, shows a card with:
- PDF icon, filename, file size
- "Drag to attach" hint text
- Uses HTML5 drag events: `onDragStart` sets `dataTransfer.setData('DownloadURL', 'application/pdf:filename.pdf:blobUrl')`
- Also works as a download link on click as fallback

**Step 3: Update invoice actions**

Update "Send Invoice" button flow:
1. Generate PDF blob
2. Show PDF drag card
3. Open mailto: link in new window
4. Update invoice status to "sent"
5. Save sentAt timestamp

**Step 4: Verify**

Create invoice, click Send. PDF downloads, email client opens with pre-filled content. Drag card appears and is draggable. Invoice status updates to "sent".

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add email drafting with mailto and draggable PDF card"
```

---

## Phase 5: Invoice List & Management

### Task 12: Build Invoices list page

**Files:**
- Modify: `src/pages/invoices.tsx`
- Create: `src/components/invoices/invoice-table.tsx`
- Create: `src/components/invoices/invoice-filters.tsx`
- Create: `src/components/invoices/invoice-status-badge.tsx`

**Step 1: Build status badge**

`src/components/invoices/invoice-status-badge.tsx` — shadcn Badge component with colors: Draft=grey/secondary, Sent=blue, Paid=green, Overdue=red/destructive. Accepts invoice and computes overdue status from dueDate.

**Step 2: Build filters component**

`src/components/invoices/invoice-filters.tsx` — Row of controls: search input, status filter (multi-select or toggle buttons for Draft/Sent/Paid/Overdue), client filter dropdown, date range picker, currency filter. Emits filter state to parent.

**Step 3: Build invoice table**

`src/components/invoices/invoice-table.tsx` — shadcn Table with columns: checkbox (for bulk select), invoice number, client name, date, due date, amount, status badge, actions dropdown (View/Edit, Duplicate, Mark Paid, Send Reminder, Delete). Sortable column headers. Uses `useLiveQuery` for reactive data.

Bulk action bar appears when rows selected: "Mark Paid", "Delete", "Export as PDFs".

**Step 4: Wire into invoices page**

`src/pages/invoices.tsx` — Filters at top, table below. "New Invoice" button in top-right. Clicking a row navigates to `/invoices/:id`. Duplicate action navigates to `/invoices/new?duplicate=ID`.

**Step 5: Verify**

Create several invoices with different statuses. Filter, sort, search. Bulk select and mark paid. Delete with confirmation.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: build invoices list with filters, sorting, search, and bulk actions"
```

---

## Phase 6: Dashboard

### Task 13: Build dashboard stats and notifications

**Files:**
- Modify: `src/pages/dashboard.tsx`
- Create: `src/components/dashboard/stats-cards.tsx`
- Create: `src/components/dashboard/notification-panel.tsx`
- Create: `src/components/dashboard/recent-activity.tsx`
- Create: `src/hooks/use-notifications.ts`

**Step 1: Build stats cards**

`src/components/dashboard/stats-cards.tsx` — 4 cards in a row using shadcn Card. Outstanding (blue), Overdue (red), Paid This Month (green), Earned This Year (purple). Each shows amount with currency symbol. Uses `invoiceService.getStats()`. Uses `useLiveQuery` for reactivity.

**Step 2: Build notification system**

`src/hooks/use-notifications.ts` — On app load, computes notifications:
- Scheduled invoices due today or within next 3 days (from `scheduleService.getDueSoon(3)`)
- Overdue invoices (from `invoiceService.getOverdue()`)
- Backup reminder (compare `lastBackupDate` with `backupReminderDays`)
Returns array of `{ type, message, action, invoiceId?, scheduleId? }`. Tracks dismissed notifications in sessionStorage.

`src/components/dashboard/notification-panel.tsx` — Slide-in panel at top of dashboard (or toast-like). Each notification has icon, message, action button (e.g. "Create Invoice", "View Invoice", "Export Now"), and dismiss X button.

**Step 3: Build recent activity list**

`src/components/dashboard/recent-activity.tsx` — List of last 20 invoices. Each row: status badge, invoice number, client name, amount, date. Click navigates to invoice.

**Step 4: Wire dashboard page**

`src/pages/dashboard.tsx` — Layout: notification panel at top (if any), stats cards row, quick action buttons ("New Invoice", "New from Template"), then recent activity.

**Step 5: Verify**

Create various invoices, mark some sent/paid. Dashboard shows correct stats. Create a schedule — notification appears for upcoming invoices. Dismiss notifications work.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: build dashboard with stats cards, notifications, and recent activity"
```

---

### Task 14: Build dashboard calendar view

**Files:**
- Create: `src/components/dashboard/calendar-view.tsx`
- Create: `src/components/dashboard/calendar-day-detail.tsx`
- Modify: `src/pages/dashboard.tsx`

**Step 1: Build calendar view**

`src/components/dashboard/calendar-view.tsx` — Month grid calendar. Each day cell shows colored dots:
- Green dot: paid invoice on that date
- Blue dot: sent invoice on that date
- Red dot: overdue invoice (past due date, still sent)
- Orange dot: scheduled invoice due on that date
- Recurring icon for recurring schedule dates

Uses date-fns for date math. Month/year navigation with arrow buttons. Today highlighted with ring/border.

Query all invoices and schedules for the visible month range using `useLiveQuery`.

**Step 2: Build day detail popover**

`src/components/dashboard/calendar-day-detail.tsx` — When clicking a day, a Popover shows all events for that date: invoice cards with status, amount, client. Scheduled items have a "Create Now" button that navigates to `/invoices/new?template=ID&client=ID`.

**Step 3: Add calendar tab to dashboard**

Update `src/pages/dashboard.tsx` — Add Tabs: "Overview" (current dashboard content) and "Calendar" (calendar view). Tabs sit below stats cards so stats are always visible.

**Step 4: Verify**

Create invoices on various dates. Calendar shows correct dots. Click dates to see details. Navigate months. Scheduled items show "Create Now" button.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add calendar view to dashboard with event dots and day details"
```

---

### Task 15: Build dashboard interactive graphs

**Files:**
- Create: `src/components/dashboard/earnings-chart.tsx`
- Create: `src/components/dashboard/client-breakdown-chart.tsx`
- Modify: `src/pages/dashboard.tsx`

**Step 1: Build earnings line chart**

`src/components/dashboard/earnings-chart.tsx` — Recharts LineChart showing monthly earnings for the last 12 months. X-axis: months. Y-axis: amount. Line for paid invoices. Tooltip on hover shows month total and breakdown by client. Rolling average trend line as a dashed secondary line. Click a data point to filter the invoices list (navigates to `/invoices?month=YYYY-MM`).

Date range filter dropdown: Last 6 months, Last 12 months, This year, All time.

**Step 2: Build client breakdown chart**

`src/components/dashboard/client-breakdown-chart.tsx` — Recharts PieChart/donut showing total earnings split by client. Hover shows client name + amount + percentage. Click a segment navigates to `/invoices?client=ID`. Configurable for same date range as earnings chart.

**Step 3: Add graphs to dashboard overview**

Update dashboard page: graphs section sits between quick actions and recent activity. Side by side on desktop (earnings chart 60%, client pie 40%), stacked on mobile.

**Step 4: Verify**

Need several invoices across different months and clients to see meaningful data. Create test data if needed. Charts render, hover tooltips work, click navigation works.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add interactive earnings line chart and client breakdown pie chart"
```

---

## Phase 7: Scheduling

### Task 16: Build recurring invoice scheduling

**Files:**
- Create: `src/components/schedules/schedule-form-dialog.tsx`
- Create: `src/components/schedules/schedule-list.tsx`
- Create: `src/hooks/use-schedule-processor.ts`
- Modify: `src/pages/settings.tsx` or `src/pages/clients.tsx`

**Step 1: Build schedule form dialog**

`src/components/schedules/schedule-form-dialog.tsx` — Dialog with: client selector, template selector (filtered to selected client's templates), frequency (Weekly/Monthly/Custom), custom interval days input (shown when Custom selected), start date (next due date). Save creates schedule via `scheduleService.create()`.

**Step 2: Build schedule list**

`src/components/schedules/schedule-list.tsx` — Table/list of all schedules. Columns: client name, template name, frequency, next due date, status (active/paused). Actions: Edit, Pause/Resume, Delete. Active schedules highlighted. Shows "due soon" badge for schedules within 7 days.

**Step 3: Build schedule processor hook**

`src/hooks/use-schedule-processor.ts` — Runs on app load (used in AppLayout). Checks all active schedules:
- If `nextDueDate` is today or past and no notification has been shown, triggers a notification
- After an invoice is created from a schedule, updates `lastGeneratedDate` and calculates `nextDueDate` based on frequency:
  - Weekly: +7 days
  - Monthly: +1 month (using date-fns addMonths)
  - Custom: +customIntervalDays

Does NOT auto-create invoices. Only creates notifications. User always reviews before sending.

**Step 4: Add schedule management UI**

Add a "Schedules" section to the Clients & Templates page (new tab), or accessible from client card actions. "Add Schedule" button opens the form dialog.

Also: on the dashboard notification panel, scheduled-invoice notifications have a "Create & Review" button that:
1. Creates invoice from the linked template
2. Updates schedule's lastGeneratedDate and nextDueDate
3. Navigates to the invoice editor

**Step 5: Verify**

Create a monthly schedule for a client with a template. Set next due date to today. Reload app — notification appears. Click "Create & Review" — invoice pre-filled, schedule updated to next month.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add recurring invoice scheduling with notifications and auto-generation"
```

---

## Phase 8: Polish & Data Management

### Task 17: Implement data export/import

**Files:**
- Modify: `src/components/settings/data-management.tsx`
- Create: `src/lib/data-export.ts`
- Create: `src/lib/data-import.ts`

**Step 1: Build export utility**

`src/lib/data-export.ts`:
```ts
import { db } from '@/db'

export async function exportAllData(): Promise<string> {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfile: await db.userProfile.toArray(),
    clients: await db.clients.toArray(),
    templates: await db.templates.toArray(),
    invoices: await db.invoices.toArray(),
    schedules: await db.schedules.toArray(),
    appSettings: await db.appSettings.toArray(),
  }
  return JSON.stringify(data, null, 2)
}

export function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

**Step 2: Build import utility**

`src/lib/data-import.ts` — Parses JSON, validates structure (checks version, required keys), returns preview counts. On confirm, clears existing data and imports. Uses Dexie transactions for atomicity.

**Step 3: Wire into data management UI**

Update `src/components/settings/data-management.tsx`:
- Export button: calls `exportAllData()`, downloads file, updates `lastBackupDate` in settings
- Import button: file picker, parse, show preview dialog with counts, confirm to import
- Bulk PDF export: placeholder until integrated with PDF generation (uses `pdf()` from @react-pdf/renderer to generate blobs, bundles with JSZip)

Install: `npm install jszip`

**Step 4: Verify**

Export data, verify JSON file contents. Import into fresh browser (clear IndexedDB via dev tools first). All data restored correctly.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement data export/import with JSON backup and restore"
```

---

### Task 18: Duplicate invoice feature

**Files:**
- Modify: `src/components/invoices/invoice-table.tsx`
- Modify: `src/hooks/use-invoice-form.ts`

**Step 1: Add duplicate action**

In invoice table actions dropdown, "Duplicate" navigates to `/invoices/new?duplicate=INVOICE_ID`.

**Step 2: Handle duplicate in invoice form hook**

In `use-invoice-form.ts`, when `duplicate` query param is present:
1. Load the source invoice
2. Copy all fields
3. Set date to today
4. Generate new invoice number (increment from client's counter)
5. Clear status to 'draft', clear sentAt/paidAt
6. Set dueDate to today + defaultDueDays

**Step 3: Verify**

Create an invoice, save it, go to invoice list, click Duplicate. New invoice opens with copied data, fresh date and number.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add one-click invoice duplication"
```

---

### Task 19: Responsive design and final polish

**Files:**
- Modify: various layout and component files

**Step 1: Mobile sidebar**

Update sidebar to be a Sheet (slide-out drawer) on screens below `md` breakpoint. Hamburger menu button in top bar.

**Step 2: Invoice editor responsive**

On screens below `lg`, stack the form and preview vertically. Preview becomes a "Preview" button that opens a Sheet with the PDF preview.

**Step 3: Dashboard responsive**

Stats cards: 2x2 grid on mobile instead of 4 across. Charts: stack vertically on mobile. Calendar: full width.

**Step 4: Table responsive**

Invoice table: hide less important columns on small screens (due date, currency). Show essential: number, client, amount, status.

**Step 5: Test all breakpoints**

Run: `npm run dev`. Test at 1440px, 1024px, 768px, 375px. All pages usable at all sizes.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add responsive design for mobile and tablet"
```

---

### Task 20: Bulk PDF export

**Files:**
- Modify: `src/components/settings/data-management.tsx`
- Modify: `src/components/invoices/invoice-table.tsx`
- Create: `src/lib/bulk-pdf-export.ts`

**Step 1: Build bulk PDF export utility**

`src/lib/bulk-pdf-export.ts` — Takes array of invoices, generates PDF blob for each using `pdf()` from @react-pdf/renderer, bundles into ZIP using JSZip, triggers download. Shows progress (X of Y generated).

**Step 2: Wire into invoice table bulk actions**

When invoices are selected, "Export as PDFs" button calls bulk export for selected invoices.

**Step 3: Wire into settings data management**

"Export All Invoices as PDFs" button in settings exports all invoices as ZIP.

**Step 4: Verify**

Select multiple invoices, export as PDFs. ZIP downloads with correctly named PDF files. Also test from settings page.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add bulk PDF export as ZIP for invoices"
```

---

### Task 21: Final build verification

**Step 1: Run production build**

Run: `npm run build`
Expected: Builds successfully with no errors

**Step 2: Test production build**

Run: `npm run preview`
Expected: App runs correctly from production build. Test all flows: create client, create template, create invoice, preview PDF, download PDF, send email, view dashboard, check calendar, export data.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify production build"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Foundation | Tasks 1-5 | Project scaffold, types, database, routing, app shell |
| 2: Settings | Task 6 | User profile, preferences, data management |
| 3: Clients & Templates | Tasks 7-8 | Client CRUD, template CRUD, line item editor |
| 4: Invoice & PDF | Tasks 9-11 | Invoice form, 3 PDF templates, live preview, email flow |
| 5: Invoice List | Task 12 | Invoice table with filters, sort, search, bulk actions |
| 6: Dashboard | Tasks 13-15 | Stats, notifications, calendar, interactive charts |
| 7: Scheduling | Task 16 | Recurring invoice schedules with notifications |
| 8: Polish | Tasks 17-21 | Export/import, duplicate, responsive, bulk PDF, final QA |
