import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  Settings,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  end?: boolean
}

const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: '',
    end: true,
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: FileText,
    end: true,
  },
  {
    label: 'New Invoice',
    href: '/invoices/new',
    icon: PlusCircle,
    end: true,
  },
]

const secondaryNavItems: NavItem[] = [
  {
    label: 'Clients & Templates',
    href: '/clients',
    icon: Users,
    end: true,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    end: true,
  },
]

function SidebarNavItem({ item }: { item: NavItem }) {
  const location = useLocation()
  // For "Invoices", we want it active on /invoices but NOT on /invoices/new or /invoices/:id
  // NavLink end prop handles this
  const isActive = item.end
    ? location.pathname === item.href
    : location.pathname.startsWith(item.href)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={item.href}
            end={item.end}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground group-hover:text-accent-foreground'
              )}
            />
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && (
              <Badge
                variant={isActive ? 'secondary' : 'default'}
                className="ml-auto size-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px] font-semibold"
              >
                {item.badge || '0'}
              </Badge>
            )}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo / App Name */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Receipt className="size-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight">Invoicer</span>
          <span className="text-[10px] leading-none text-muted-foreground">
            Invoice Manager
          </span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {mainNavItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} />
          ))}
        </nav>

        <Separator className="my-4" />

        <nav className="flex flex-col gap-1">
          {secondaryNavItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <Separator />
      <div className="px-5 py-3">
        <p className="text-[11px] text-muted-foreground">
          v0.1.0
        </p>
      </div>
    </aside>
  )
}
