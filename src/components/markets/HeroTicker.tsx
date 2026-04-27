'use client'

import Link from 'next/link'
import Image from 'next/image'

interface TickerMarket {
  id: string
  title: string
  category: string
  yes_price: number
  image_url: string | null
}

const categoryEmoji: Record<string, string> = {
  politics: '🏛️', sports: '🏆', economy: '📈', crypto: '₿',
  entertainment: '🎬', technology: '💻', world: '🌍', weather: '🌤️',
}

function TickerCard({ market }: { market: TickerMarket }) {
  const yes = Math.round(market.yes_price * 100)
  const no = 100 - yes

  return (
    <Link
      href={`/markets/${market.id}`}
      className="shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-background hover:border-foreground/30 hover:shadow-sm transition-all mx-2"
    >
      {/* Icon */}
      <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
        {market.image_url ? (
          <Image src={market.image_url} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
        ) : (
          <span className="text-sm">{categoryEmoji[market.category] || '📊'}</span>
        )}
      </div>

      {/* Title */}
      <p className="text-xs font-medium text-foreground max-w-[160px] truncate">{market.title}</p>

      {/* Probs */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-bold text-green-600">{yes}%</span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs font-bold text-red-500">{no}%</span>
      </div>
    </Link>
  )
}

export default function HeroTicker({ markets }: { markets: TickerMarket[] }) {
  if (markets.length === 0) return null

  // Duplicate for seamless loop
  const doubled = [...markets, ...markets]

  return (
    <div className="mt-8 -mx-8 overflow-hidden">
      <div className="flex" style={{ animation: `ticker ${markets.length * 4}s linear infinite` }}>
        {doubled.map((m, i) => (
          <TickerCard key={`${m.id}-${i}`} market={m} />
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
