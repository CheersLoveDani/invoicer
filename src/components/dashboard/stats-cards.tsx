import { useEffect, useState } from 'react'
import { Banknote, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { invoiceService, profileService } from '@/db'
import { CURRENCY_SYMBOLS, type Currency } from '@/types'

interface Stats {
  outstanding: number
  overdue: number
  paidThisMonth: number
  earnedThisYear: number
}

function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [currency, setCurrency] = useState<Currency>('GBP')

  useEffect(() => {
    async function load() {
      const [statsData, profile] = await Promise.all([
        invoiceService.getStats(),
        profileService.get(),
      ])
      setStats(statsData)
      setCurrency(profile.defaultCurrency)
    }
    load()
  }, [])

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Outstanding',
      amount: stats.outstanding,
      icon: Banknote,
      iconClassName: 'text-blue-600 dark:text-blue-400',
      bgClassName: 'bg-blue-100 dark:bg-blue-900/40',
    },
    {
      title: 'Overdue',
      amount: stats.overdue,
      icon: AlertTriangle,
      iconClassName: 'text-red-600 dark:text-red-400',
      bgClassName: 'bg-red-100 dark:bg-red-900/40',
    },
    {
      title: 'Paid This Month',
      amount: stats.paidThisMonth,
      icon: CheckCircle,
      iconClassName: 'text-green-600 dark:text-green-400',
      bgClassName: 'bg-green-100 dark:bg-green-900/40',
    },
    {
      title: 'Earned This Year',
      amount: stats.earnedThisYear,
      icon: TrendingUp,
      iconClassName: 'text-purple-600 dark:text-purple-400',
      bgClassName: 'bg-purple-100 dark:bg-purple-900/40',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bgClassName}`}>
                  <Icon className={`h-5 w-5 ${card.iconClassName}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="truncate text-xl font-bold tracking-tight">
                    {formatAmount(card.amount, currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
