'use client'

import { useEffect, useRef } from 'react'
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
      className="inline-flex shrink-0 items-center gap-2.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:border-foreground/30 transition-colors mx-1.5"
      style={{ textDecoration: 'none' }}
    >
      <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
        {market.image_url ? (
          <Image src={market.image_url} alt="" width={28} height={28} className="w-full h-full object-cover" unoptimized />
        ) : (
          <span className="text-xs">{categoryEmoji[market.category] || '📊'}</span>
        )}
      </div>
      <span className="text-xs font-medium text-foreground whitespace-nowrap max-w-[150px] truncate">{market.title}</span>
      <span className="text-xs font-bold text-green-600 shrink-0">{yes}%</span>
      <span className="text-xs text-muted-foreground shrink-0">/</span>
      <span className="text-xs font-bold text-red-500 shrink-0">{no}%</span>
    </Link>
  )
}

export default function HeroTicker({ markets }: { markets: TickerMarket[] }) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || markets.length === 0) return

    let pos = 0
    const speed = 0.4
    let raf: number

    function step() {
      pos -= speed
      const half = track!.scrollWidth / 2
      if (Math.abs(pos) >= half) pos = 0
      track!.style.transform = `translateX(${pos}px)`
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [markets.length])

  if (markets.length === 0) return null

  const doubled = [...markets, ...markets]

  return (
    <div className="mt-6 -mx-8 border-t border-border pt-4 pb-1 overflow-hidden">
      <div ref={trackRef} className="flex will-change-transform">
        {doubled.map((m, i) => (
          <TickerCard key={`${m.id}-${i}`} market={m} />
        ))}
      </div>
    </div>
  )
}
