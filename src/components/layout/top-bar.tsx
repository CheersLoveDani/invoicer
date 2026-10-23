import { useLocation } from 'react-router-dom'
import { Sun, Moon, Monitor, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/dashboard/notification-panel'
import { useTheme } from '@/hooks/use-theme'
import type { Theme } from '@/types'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/invoices': 'Invoices',
  '/invoices/new': 'New invoice',
  '/clients': 'Clients & templates',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (/^\/invoices\/[^/]+$/.test(pathname)) return 'Edit invoice'
  return 'Invoicer'
}

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-3 md:px-5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
        {/* Pages carry their own heading on wider screens */}
        <h1 className="text-base font-semibold tracking-tight md:sr-only">
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
              {theme === 'dark' ? (
                <Moon key="dark" className="size-4 animate-pop" />
              ) : theme === 'light' ? (
                <Sun key="light" className="size-4 animate-pop" />
              ) : (
                <Monitor key="system" className="size-4 animate-pop" />
              )}
              <span className="sr-only">Theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <DropdownMenuRadioItem value="light">
                <Sun className="size-4" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="size-4" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor className="size-4" />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
