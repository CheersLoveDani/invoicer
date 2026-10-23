# Invoicer

A local-first invoicing app for freelancers. Create invoices from client presets and templates, keep track of what has been sent, paid or is overdue, and send polished PDFs from your own mail app. Everything stays on your computer: there is no server and no account.

## What it does

- **Invoice numbers that follow what you actually sent.** Each client has a prefix (for example `ACME`) and the next number is worked out from the last invoice you sent or marked paid. Opening a new invoice, or abandoning a draft, never uses a number up. The dashboard lists every client's next number.
- **Editor with a live PDF preview**, three PDF styles (Clean, Modern, Compact), your logo, hourly and fixed-price work, and expenses.
- **Templates and schedules** for repeat invoices, with reminders when one is due.
- **Sending**: opens a ready-made draft in your mail app and gives you a PDF card to drag onto it.
- **Dashboard**: what is waiting to be paid, what is overdue, monthly earnings by client, a calendar, and anything that needs attention.
- **Backups**: export everything to a JSON file and restore it later.
- **Automatic updates** in the desktop app.

## Install

Download the installer for your platform from the [latest release](https://github.com/CheersLoveDani/invoicer/releases/latest). Once installed, Invoicer checks for new versions on launch and every few hours, downloads them in the background, and asks before restarting to install.

Your invoices, clients and settings are kept in the app's own storage on your computer. They are never uploaded anywhere, and they are not part of this repository.

## Develop

Requires Node 22 and, for the desktop app, a [Rust toolchain and the Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run dev         # web app at http://localhost:5173
npm run tauri:dev   # desktop app
npm run lint
npm run build       # type-check and build the web app
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4 with shadcn/ui, Dexie (IndexedDB), @react-pdf/renderer, Recharts and Tauri 2.

## Releasing

1. Bump `version` in `package.json` (Tauri reads it from there) and `src-tauri/Cargo.toml`.
2. Commit, then tag and push: `git tag v0.3.0 && git push origin v0.3.0`.

The release workflow builds Windows, macOS and Linux installers, signs the update bundles with the `TAURI_SIGNING_PRIVATE_KEY` repository secret, and attaches a `latest.json` that installed apps update from. The matching public key is in `src-tauri/tauri.conf.json`.

## License

[MIT](LICENSE)
