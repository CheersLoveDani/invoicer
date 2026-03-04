# Invoice App — Design Document

**Date:** 2026-03-04
**Status:** Approved

## Overview

A single-user, local-first invoice webapp for a freelancer. Create, manage, track, and send professional invoices with client presets, recurring schedules, PDF generation, and email drafting. Runs entirely in the browser with an architecture ready for optional Tauri wrapping.

## Tech Stack

- **Framework:** React + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Data:** Dexie.js (IndexedDB wrapper)
- **PDF:** @react-pdf/renderer
- **Charts:** Recharts
- **Build:** Vite
- **Theme:** Dark / Light / System toggle

## App Structure & Navigation

Sidebar navigation with 5 main pages. Sidebar collapses to icons on smaller screens. Dark/light toggle in the top bar.

### 1. Dashboard

Home view with:

- **Quick stats cards:** Outstanding amount, Overdue amount, Paid this month, Earned this year
- **On-load notification panel:** Actionable alerts that slide in on app open:
  - Scheduled invoices due today/soon — click to auto-generate from template
  - Overdue invoices — click to open with "Send Reminder" action
  - Notifications are dismissable, badge count on sidebar icon
- **Calendar view** (toggleable tab):
  - Month view with colored dots: green=paid, blue=sent, red=overdue, orange=upcoming scheduled, striped=recurring
  - Click any date to see invoices/events, click scheduled event to generate invoice
  - Navigate months, today highlighted
- **Interactive graphs:**
  - Monthly earnings line chart (last 12 months), hover for client breakdown, click to filter invoice list
  - Client breakdown pie/donut chart, click segment to see client's invoices
  - Income trend line (rolling average overlay)
  - Filterable by date range and currency
- **Recent activity:** Chronological list of last 10-20 invoices with status badges
- **Quick actions:** "New Invoice" and "New from Template" buttons

### 2. Invoices

Full table of all invoices with:

- Status filters: Draft (grey), Sent (blue), Paid (green), Overdue (red)
- Search by invoice number, client name, or description
- Sort by date, amount, client name, status
- Filter by client, date range, currency
- Bulk actions: mark as paid, delete, export selected as PDFs
- Click any invoice to view/edit

### 3. Create/Edit Invoice

Two-panel layout: form on left (~60%), live PDF preview on right (~40%). Preview updates in real-time. On smaller screens, preview is a toggleable overlay.

**Starting options:** Blank invoice, from template, from client, or duplicate existing.

**Form sections:**

1. **Header** — Title field (e.g. "Monthly Development Invoice"), date (defaults to today), invoice number (auto-populated from client prefix + next number, editable)
2. **Client section** — Type-to-search saved clients (autocomplete) or enter manually. Selecting a client fills details. All fields editable.
3. **Line items** — Add rows with type selector:
   - Hourly: description + rate + hours = auto-calculated price
   - Fixed: description + price
   - Expense: description + cost
   - Custom: freeform description + amount
   - Drag to reorder, delete per row
   - Expenses shown in separate section below work items
   - Subtotal and total auto-calculated
4. **Notes & Payment Terms** — Free text area for terms like "This invoice is payable upon receipt"
5. **Payment Details** — Pre-filled from profile. Editable payment reference field (auto-populated from template if available).
6. **PDF Style** — Dropdown for template style, logo toggle on/off

**Actions:**

- **Save as Draft**
- **Download PDF**
- **Send Invoice** — Downloads PDF + opens mailto: with pre-filled subject/body + shows draggable PDF card for drag-to-email-client attachment
- **Save as Template**

### 4. Clients & Templates

- Client cards showing details, associated templates, invoice history
- Template management: create, edit, delete
- Templates are flexible — save as much or as little as you want (client info, line items, rates, expenses, payment references)
- Everything editable when creating an invoice from a template

### 5. Settings

- **Your Profile:** Name, email, address, phone, bank details (account name, number, sort code, bank), logo upload (drag & drop + file picker), default currency
- **Preferences:** Theme (light/dark/system), default due date period (days), default PDF template style, backup reminder interval
- **Data Management:** Export all data (JSON), import data (with validation preview), bulk export invoices as ZIP of PDFs, backup reminder on app load

## Data Model

### UserProfile (singleton)

| Field | Type | Notes |
|-------|------|-------|
| name | string | |
| email | string | |
| address | string | Multi-line |
| phone | string | Optional |
| bankAccountName | string | |
| bankAccountNumber | string | |
| bankSortCode | string | |
| bankName | string | |
| logo | blob/base64 | Optional |
| defaultCurrency | string | GBP, USD, EUR, etc. |

### Client

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | Primary key |
| name | string | |
| email | string | |
| address | string | Multi-line |
| invoicePrefix | string | e.g. "ACME", "GLOBEX" |
| nextInvoiceNumber | number | Auto-increments |
| notes | string | Internal only, not on invoice |
| createdAt | Date | |
| updatedAt | Date | |

### InvoiceTemplate

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | Primary key |
| name | string | Template display name |
| clientId | string | Optional link to client |
| title | string | e.g. "Monthly Development Invoice" |
| lineItems | LineItem[] | Default line items |
| expenses | LineItem[] | Default expenses |
| notes | string | Default payment terms text |
| paymentReference | string | Default reference pattern |
| pdfTemplate | string | Style choice |
| createdAt | Date | |
| updatedAt | Date | |

### Invoice

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | Primary key |
| invoiceNumber | string | Prefix + number (e.g. "ACME2") |
| title | string | Invoice heading |
| status | enum | draft, sent, paid |
| date | Date | Invoice date |
| dueDate | Date | For overdue calculation |
| from | object | Snapshot of user profile at creation |
| to | object | Snapshot of client details at creation |
| lineItems | LineItem[] | |
| expenses | LineItem[] | |
| notes | string | Payment terms / notes |
| paymentDetails | object | Bank info snapshot + reference |
| currency | string | |
| pdfTemplate | string | Style choice |
| templateId | string | Source template ID, optional |
| createdAt | Date | |
| sentAt | Date | Optional |
| paidAt | Date | Optional |

**LineItem type:**

| Field | Type | Notes |
|-------|------|-------|
| type | enum | hourly, fixed, expense, custom |
| description | string | |
| rate | number | Optional (hourly) |
| hours | number | Optional (hourly) |
| price | number | Calculated or manual |

### Schedule

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | Primary key |
| clientId | string | Linked client |
| templateId | string | Linked template |
| frequency | enum | weekly, monthly, custom |
| customIntervalDays | number | For custom frequency |
| nextDueDate | Date | |
| lastGeneratedDate | Date | Optional |
| active | boolean | |

### AppSettings (singleton)

| Field | Type | Notes |
|-------|------|-------|
| theme | enum | light, dark, system |
| defaultDueDays | number | Default 30 |
| defaultPdfTemplate | string | |
| lastBackupDate | Date | |
| backupReminderDays | number | Default 30, 0 = disabled |

**Key principle:** Invoices store snapshots of user and client details at creation time. Updating your profile doesn't change existing invoices.

## Overdue Detection

- Computed state, not stored — an invoice is "overdue" if status is "sent" and current date > dueDate
- Checked on app load and when viewing invoice lists
- Default due period: 30 days from invoice date (configurable in settings, overridable per invoice)

## PDF Templates

Three templates built with @react-pdf/renderer:

1. **Clean** (default) — Minimal, matches current invoice style. Simple tables, black on white, no color.
2. **Modern** — Subtle accent color bar at top (configurable), rounded table styling, prominent logo placement, more whitespace.
3. **Compact** — Denser layout for simpler invoices, smaller fonts, tighter spacing, fits more on one page.

All templates support: optional logo, custom title, from/to sections, work items table, separate expenses section, total, notes/terms, bank details, currency symbol adjustment.

## Email Flow

- **mailto: link** with pre-filled:
  - To: client email
  - Subject: "Invoice [number] — [your name]"
  - Body: Professional greeting, invoice summary (amount, description), payment terms note
- **Draggable PDF card:** After generating, a visual card appears that can be dragged directly into email compose windows (Chromium browsers). Uses HTML5 Drag API with DownloadURL type.
- **Download fallback:** Standard download button always available alongside drag card.

## Additional Features

- **Duplicate invoice:** One-click clone, opens in editor with new date and incremented number
- **Notes & payment terms:** Free-text field per invoice, saveable in templates
- **Overdue highlighting:** Visual alerts on dashboard, auto-detected from due dates
- **Data backup reminder:** Configurable nudge on app load if X days since last JSON export
- **Selectable currency:** Dropdown on invoices, symbol/formatting adjusts per currency

## Architecture Notes

- All data in Dexie.js (IndexedDB) for browser mode
- Data access abstracted behind a service layer so Tauri SQLite backend can be swapped in later
- JSON export/import for data portability and backup
- No backend, no server, no authentication — single-user local-first app
