import { useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, SidebarContent } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { UpdateNotifier } from '@/components/layout/update-notifier'
import { NewInvoiceDialog } from '@/components/invoice/new-invoice-dialog'
import { Toaster } from '@/components/ui/sonner'
import { NotificationsProvider } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  // The editor keeps one instance from /invoices/new to /invoices/:id, so it
  // shares one key and is not replayed (or remounted) when a draft is saved
  const isEditor = pathname.startsWith('/invoices/')
  const pageKey = isEditor ? 'editor' : pathname

  const handleMenuClick = useCallback(() => setMobileOpen(true), [])
  const handleNavClick = useCallback(() => setMobileOpen(false), [])

  return (
    <NotificationsProvider>
    <div className="flex h-screen overflow-hidden bg-sidebar">
      <Sidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 border-0 bg-sidebar p-0 text-sidebar-foreground"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          <SidebarContent onNavClick={handleNavClick} />
        </SheetContent>
      </Sheet>

      {/* The work surface sits on the sidebar like a sheet of paper */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:my-2 md:mr-2 md:rounded-2xl md:shadow-[0_0_0_1px_rgb(0_0_0/0.04),0_8px_30px_-12px_rgb(0_0_0/0.35)]">
        <TopBar onMenuClick={handleMenuClick} />
        <main
          className={cn(
            'min-h-0 flex-1',
            isEditor ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
          )}
        >
          <div
            key={pageKey}
            className={cn(
              'animate-page',
              isEditor ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto max-w-7xl px-4 pt-2 pb-10 md:px-8',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
      <UpdateNotifier />
      <NewInvoiceDialog />
    </div>
    </NotificationsProvider>
  )
}
