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

const categoryGradient: Record<MarketCategory, string> = {
  politics: 'from-blue-900 to-blue-700',
  sports:   'from-green-800 to-green-600',
  economy:  'from-emerald-800 to-emerald-600',
  crypto:   'from-orange-800 to-orange-600',
  entertainment: 'from-purple-900 to-purple-700',
  technology:    'from-slate-800 to-slate-600',
  world:    'from-sky-800 to-sky-600',
  weather:  'from-cyan-800 to-cyan-600',
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

export default function MarketCard({ market }: { market: Market }) {
  const yesPercent = Math.round(market.yes_price * 100)
  const cat = market.category as MarketCategory

  return (
    <Link href={`/markets/${market.id}`} className="block h-full">
      <div className="group rounded-2xl border border-border bg-card hover:shadow-md hover:border-foreground/20 transition-all duration-200 overflow-hidden h-full flex flex-col">

        {/* Image header — always full width */}
        <div className="relative h-36 shrink-0 overflow-hidden">
          {market.image_url ? (
            <Image
              src={market.image_url}
              alt={market.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${categoryGradient[cat] || 'from-gray-800 to-gray-600'} flex items-center justify-center`}>
              <span className="text-4xl opacity-60">{categoryEmoji[cat] || '📊'}</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Category badge */}
          <div className="absolute bottom-2.5 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-xs font-medium">
              {categoryEmoji[cat]} {categoryLabels[cat] || cat}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Title */}
          <p className="text-sm font-semibold text-foreground leading-snug mb-3 flex-1 line-clamp-2">
            {market.title}
          </p>

          {/* Probability bar */}
          <div className="mb-3">
            <div className="h-1 w-full bg-red-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${yesPercent}%` }} />
            </div>
          </div>

          {/* Yes / No */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2">
              <p className="text-xs text-muted-foreground">Yes</p>
              <p className="text-sm font-bold text-green-600">{yesPercent}%</p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-muted-foreground">No</p>
              <p className="text-sm font-bold text-red-500">{100 - yesPercent}%</p>
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
