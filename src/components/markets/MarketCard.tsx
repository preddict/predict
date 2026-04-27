import Link from 'next/link'
import Image from 'next/image'
import { TrendingUp, Clock } from 'lucide-react'
import type { Market, MarketCategory } from '@/types'

const categoryLabels: Record<MarketCategory, string> = {
  politics: 'Politics', sports: 'Sports', economy: 'Economy',
  crypto: 'Crypto', entertainment: 'Entertainment', technology: 'Technology',
  world: 'World', weather: 'Weather',
}

const categoryEmoji: Record<MarketCategory, string> = {
  politics: '🏛️',
  sports: '🏆',
  economy: '📈',
  crypto: '₿',
  entertainment: '🎬',
  technology: '💻',
  world: '🌍',
  weather: '🌤️',
}

function formatVolume(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days < 0) return 'Ended'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export default function MarketCard({ market }: { market: Market }) {
  const yesPercent = Math.round(market.yes_price * 100)
  const noPercent = 100 - yesPercent
  const cat = market.category as MarketCategory

  return (
    <Link href={`/markets/${market.id}`} className="block">
      <div className="group rounded-xl border border-border bg-card hover:shadow-md hover:border-foreground/20 transition-all duration-200 overflow-hidden h-full flex flex-col">

        {/* Progress bar */}
        <div className="h-1 w-full bg-red-100 shrink-0">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${yesPercent}%` }} />
        </div>

        <div className="p-4 flex flex-col flex-1">
          {/* Icon + Category */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
              {market.image_url ? (
                <Image
                  src={market.image_url}
                  alt={market.title}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-lg leading-none">{categoryEmoji[cat] || '📊'}</span>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {categoryLabels[cat] || cat}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-foreground leading-snug mb-4 min-h-[2.5rem] line-clamp-2 flex-1">
            {market.title}
          </p>

          {/* Yes / No */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2">
              <p className="text-xs text-muted-foreground">Yes</p>
              <p className="text-sm font-bold text-green-600">{yesPercent}%</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-muted-foreground">No</p>
              <p className="text-sm font-bold text-red-500">{noPercent}%</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {formatVolume(market.volume_brl)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {daysUntil(market.closes_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
