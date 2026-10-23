import { NavLink, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { LayoutDashboard, FileText, Plus, Users, Settings, Download } from 'lucide-react'
import { db } from '@/db'
import { cn } from '@/lib/utils'
import { openNewInvoice } from '@/components/invoice/new-invoice-dialog'
import { isOverdue } from '@/lib/invoice-amounts'
import { APP_VERSION, updater, useUpdateState } from '@/lib/native/updater'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Clients & templates', href: '/clients', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
]

function isActive(href: string, pathname: string) {
  // Editing an invoice still belongs to Invoices
  if (href === '/invoices') return pathname.startsWith('/invoices') && pathname !== '/invoices/new'
  return pathname === href
}

function SidebarNavItem({
  item,
  active,
  count,
  onClick,
}: {
  item: NavItem
  active: boolean
  count?: number
  onClick?: () => void
}) {
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        active
          ? 'text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-sidebar-accent"
          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
        >
          <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
        </motion.span>
      )}
      <item.icon
        className={cn(
          'relative size-4 shrink-0 transition-colors',
          active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground',
        )}
      />
      <span className="relative truncate">{item.label}</span>
      {count ? (
        <span
          key={count}
          title={`${count} overdue`}
          className="relative ml-auto flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-semibold text-warning-foreground tabular dark:text-warning-foreground"
        >
          {count}
        </span>
      ) : null}
    </NavLink>
  )
}

export function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { pathname } = useLocation()
  const update = useUpdateState()
  const overdue = useLiveQuery(async () => {
    const sent = await db.invoices.where('status').equals('sent').toArray()
    return sent.filter((inv) => isOverdue(inv)).length
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="relative flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]">
          <span className="text-base leading-none font-bold">£</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">
            Invoicer
          </span>
          <span className="text-xs text-sidebar-foreground/60">Billing, kept simple</span>
        </div>
      </div>

      <div className="px-3 pt-2 pb-4">
        <button
          type="button"
          onClick={() => {
            onNavClick?.()
            openNewInvoice()
          }}
          className={cn(
            'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97]',
            pathname === '/invoices/new'
              ? 'bg-sidebar-primary/85 text-sidebar-primary-foreground'
              : 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_6px_20px_-8px_var(--sidebar-primary)] hover:brightness-105',
          )}
        >
          <Plus className="size-4" strokeWidth={2.5} />
          New invoice
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            active={isActive(item.href, pathname)}
            count={item.href === '/invoices' ? overdue : undefined}
            onClick={onNavClick}
          />
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border px-5 py-4">
        {update.status === 'ready' && (
          <button
            type="button"
            onClick={() => void updater.install()}
            className="flex w-full animate-rise cursor-pointer items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-left text-xs font-medium text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/70"
          >
            <Download className="size-3.5 text-sidebar-primary" />
            Restart to update to {update.version}
          </button>
        )}
        <p className="text-xs text-sidebar-foreground/50 tabular">Version {APP_VERSION}</p>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <SidebarContent />
    </aside>
  )
}
