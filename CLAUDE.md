# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-user, local-first invoice web app for a freelancer. Create, manage, track, and send professional invoices with client presets, recurring schedules, PDF generation, and email drafting. Runs entirely in the browser with no backend. Architecture is designed for optional Tauri wrapping later.

Design spec: `docs/plans/2026-03-04-invoice-app-design.md`
Implementation plan: `docs/plans/2026-03-04-invoice-app-implementation.md`

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # TypeScript type-check + Vite production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

## Tech Stack

- **Framework:** React 19 + TypeScript 5.9, Vite 7
- **Styling:** Tailwind CSS 4 + shadcn/ui (not yet initialized)
- **Data:** Dexie.js (IndexedDB) — all data local, no backend
- **PDF:** @react-pdf/renderer for client-side PDF generation
- **Charts:** Recharts for dashboard visualizations
- **Routing:** React Router v7
- **Utilities:** date-fns, uuid

## Architecture

### Data Layer
All data lives in IndexedDB via Dexie.js. Data access must be abstracted behind a service layer (`src/services/`) so a Tauri SQLite backend can be swapped in later without changing components. Use `dexie-react-hooks` for reactive queries in components.

### Key Data Entities
- **UserProfile** — singleton with name, email, address, bank details, logo
- **Client** — invoice prefix + auto-incrementing number per client
- **InvoiceTemplate** — reusable invoice presets (partial: any fields optional)
- **Invoice** — stores snapshots of user/client details at creation time (updating profile doesn't change existing invoices)
- **Schedule** — recurring invoice generation linked to client + template
- **AppSettings** — singleton for theme, defaults, backup config

### Overdue Detection
Computed at runtime, not stored. An invoice is overdue if `status === 'sent' && now > dueDate`.

### PDF Templates
Three styles built with @react-pdf/renderer: Clean (minimal), Modern (accent color), Compact (dense). All support logo, currency formatting, work items + expenses sections.

### Email Flow
Uses `mailto:` links with pre-filled fields. Draggable PDF card for drag-to-email attachment (HTML5 Drag API with DownloadURL).

## App Structure (5 pages)

1. **Dashboard** — stats cards, notification panel, calendar view, earnings/client charts, recent activity
2. **Invoices** — filterable/sortable table with bulk actions
3. **Create/Edit Invoice** — two-panel: form (left) + live PDF preview (right)
4. **Clients & Templates** — client cards, template CRUD
5. **Settings** — profile, preferences, data export/import

## Conventions

- **Commits:** Never include "Claude" or "Co-Authored-By" lines in commit messages
- Path alias: `@` maps to `src/`
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all enabled
- ESM modules (`"type": "module"` in package.json)
- Types go in `src/types/index.ts`
