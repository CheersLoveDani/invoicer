import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, SidebarContent } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleMenuClick = useCallback(() => {
    setMobileOpen(true)
  }, [])

  const handleNavClick = useCallback(() => {
    setMobileOpen(false)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 bg-sidebar text-sidebar-foreground"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          <SidebarContent onNavClick={handleNavClick} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={handleMenuClick} />
        <ScrollArea className="flex-1">
          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </ScrollArea>
      </div>
      <Toaster />
    </div>
  )
}
