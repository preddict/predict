import Link from 'next/link'
import Image from 'next/image'
import { TrendingUp, Clock, Users } from 'lucide-react'
import type { Market, MarketCategory } from '@/types'

const categoryLabels: Record<MarketCategory, string> = {
  politics: 'Politics', sports: 'Sports', economy: 'Economy',
  crypto: 'Crypto', entertainment: 'Entertainment', technology: 'Technology',
  world: 'World', weather: 'Weather',
}

const categoryEmoji: Record<MarketCategory, string> = {
  politics: '🏛️', sports: '🏆', economy: '📈', crypto: '₿',
  entertainment: '🎬', technology: '💻', world: '🌍', weather: '🌤️',
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
  if (days === 1) return '1d left'
  if (days <= 7) return `${days}d left`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MarketCard({ market, featured = false }: { market: Market; featured?: boolean }) {
  const yesPercent = Math.round(market.yes_price * 100)
  const cat = market.category as MarketCategory

  return (
    <Link href={`/markets/${market.id}`} className="block h-full">
      <div className={`group rounded-xl border border-border bg-card hover:shadow-sm hover:border-foreground/30 transition-all duration-200 overflow-hidden h-full flex flex-col ${featured ? 'ring-1 ring-border' : ''}`}>

        {/* Image or gradient header */}
        {market.image_url ? (
          <div className="relative h-28 bg-muted shrink-0 overflow-hidden">
            <Image
              src={market.image_url}
              alt={market.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-3">
              <span className="px-2 py-0.5 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
                {categoryEmoji[cat]} {categoryLabels[cat] || cat}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-1.5 w-full bg-red-100 shrink-0">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${yesPercent}%` }} />
          </div>
        )}

        <div className="p-4 flex flex-col flex-1">
          {/* Category (no image case) */}
          {!market.image_url && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs text-muted-foreground">{categoryEmoji[cat]} {categoryLabels[cat] || cat}</span>
            </div>
          )}

          {/* Title */}
          <p className={`font-semibold text-foreground leading-snug mb-3 flex-1 line-clamp-2 ${featured ? 'text-base' : 'text-sm'}`}>
            {market.title}
          </p>

          {/* Probability bar */}
          {market.image_url && (
            <div className="mb-3">
              <div className="h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${yesPercent}%` }} />
              </div>
            </div>
          )}

          {/* Yes / No */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2">
              <p className="text-xs text-muted-foreground">Yes</p>
              <p className={`font-bold text-green-600 ${featured ? 'text-lg' : 'text-sm'}`}>{yesPercent}%</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-muted-foreground">No</p>
              <p className={`font-bold text-red-500 ${featured ? 'text-lg' : 'text-sm'}`}>{100 - yesPercent}%</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {formatVolume(market.volume_brl)}
            </span>
            {market.total_bettors ? (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {market.total_bettors}
              </span>
            ) : null}
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
