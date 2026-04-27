'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Flame, ChevronRight } from 'lucide-react'
import { getMarketImage } from '@/lib/marketUtils'
import { MarketImage } from '@/components/ui/market-image'

interface FeaturedMarket {
  id: string
  title: string
  category: string
  yes_price: number
  no_price: number
  volume_brl: number
  image_url: string | null
  closes_at: string
}

interface PricePoint { yes_price: number; timestamp: string }

interface TrendingMarket {
  id: string
  title: string
  yes_price: number
  volume_brl: number
  image_url: string | null
  category: string
}

interface HotTopic { category: string; volume: number }

interface Props {
  featured: FeaturedMarket | null
  history: PricePoint[]
  trending: TrendingMarket[]
  hotTopics: HotTopic[]
  totalMarkets: number
  totalVolume: number
  totalTraders: number
  allFeatured: FeaturedMarket[]
  allHistories: Record<string, PricePoint[]>
}

const categoryEmoji: Record<string, string> = {
  politics: '🏛️', sports: '🏆', economy: '📈', crypto: '₿',
  entertainment: '🎬', technology: '💻', world: '🌍', weather: '🌤️',
}
const categoryLabel: Record<string, string> = {
  politics: 'Politics', sports: 'Sports', economy: 'Economy', crypto: 'Crypto',
  entertainment: 'Entertainment', technology: 'Technology', world: 'World', weather: 'Weather',
}
const categoryGradient: Record<string, string> = {
  politics: 'from-blue-900 to-blue-700', sports: 'from-green-800 to-green-600',
  economy: 'from-emerald-800 to-emerald-600', crypto: 'from-orange-800 to-orange-600',
  entertainment: 'from-purple-900 to-purple-700', technology: 'from-slate-800 to-slate-600',
  world: 'from-sky-800 to-sky-600', weather: 'from-cyan-800 to-cyan-600',
}

function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const SparkTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow">
      <span className="font-semibold text-green-600">{Math.round(payload[0].value * 100)}%</span>
    </div>
  )
}

export default function HeroPanel({ featured: initialFeatured, history: initialHistory, trending, hotTopics, totalMarkets, totalVolume, totalTraders, allFeatured, allHistories }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [fade, setFade] = useState(true)

  const markets = allFeatured.length > 0 ? allFeatured : (initialFeatured ? [initialFeatured] : [])
  const featured = markets[activeIdx] || initialFeatured
  const history = featured ? (allHistories[featured.id] || (activeIdx === 0 ? initialHistory : [])) : initialHistory

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (markets.length <= 1) return
    const timer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % markets.length)
        setFade(true)
      }, 300)
    }, 6000)
    return () => clearInterval(timer)
  }, [markets.length])

  function goTo(idx: number) {
    if (idx === activeIdx) return
    setFade(false)
    setTimeout(() => { setActiveIdx(idx); setFade(true) }, 200)
  }

  if (!featured) return null

  const yesPercent = Math.round(featured.yes_price * 100)
  const noPercent = 100 - yesPercent
  const chartData = history.map(h => ({ v: h.yes_price }))
  const priceChange = history.length >= 2
    ? (history[history.length - 1].yes_price - history[0].yes_price) * 100
    : 0

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card overflow-hidden">

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">Live</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <span className="text-xs text-foreground font-semibold">{totalMarkets}</span>
        <span className="text-xs text-muted-foreground -ml-3">markets open</span>
        <div className="h-3 w-px bg-border" />
        <span className="text-xs text-foreground font-semibold">{fmtVol(totalVolume)}</span>
        <span className="text-xs text-muted-foreground -ml-3">total volume</span>
        <div className="h-3 w-px bg-border" />
        <span className="text-xs text-foreground font-semibold">{totalTraders}</span>
        <span className="text-xs text-muted-foreground -ml-3">traders</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 min-h-[420px]">

        {/* Featured market — left */}
        <div className="lg:col-span-3 flex flex-col border-b lg:border-b-0 lg:border-r border-border">

          {/* Market image */}
          <Link href={`/markets/${featured.id}`} className="relative h-48 shrink-0 overflow-hidden block group">
            <MarketImage
              src={getMarketImage({ image_url: featured.image_url, category: featured.category, id: featured.id })}
              alt={featured.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              category={featured.category}
              marketId={featured.id}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-xs font-medium">
                {categoryEmoji[featured.category]} {categoryLabel[featured.category] || featured.category} · {fmtVol(featured.volume_brl)} Vol
              </span>
            </div>

            {/* Dot indicators */}
            {markets.length > 1 && (
              <div className="absolute bottom-3 right-4 flex gap-1.5">
                {markets.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.preventDefault(); goTo(i) }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIdx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/75'}`}
                  />
                ))}
              </div>
            )}
          </Link>

          {/* Market content */}
          <div
            className="flex-1 p-5 flex flex-col"
            style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.25s ease' }}
          >
            <Link href={`/markets/${featured.id}`}>
              <h2 className="text-lg font-bold text-foreground leading-snug mb-4 hover:underline underline-offset-2 line-clamp-2">
                {featured.title}
              </h2>
            </Link>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <p className="text-xs text-muted-foreground mb-1">YES</p>
                <p className="text-3xl font-bold text-green-600">{yesPercent}%</p>
                {priceChange !== 0 && (
                  <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${priceChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {priceChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                <p className="text-xs text-muted-foreground mb-1">NO</p>
                <p className="text-3xl font-bold text-red-500">{noPercent}%</p>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 1 ? (
              <div className="flex-1 min-h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<SparkTooltip />} />
                    <Area type="monotone" dataKey="v" stroke="#16a34a" strokeWidth={2.5} fill="url(#heroGrad)" dot={false} isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <p className="text-xs text-muted-foreground mt-3">Ends {fmtDate(featured.closes_at)}</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 flex flex-col divide-y divide-border">

          {/* Trending */}
          <div className="flex-1 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Trending</h3>
              <Link href="/?sort=volume" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                See all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {trending.slice(0, 5).map((m, i) => {
                const yes = Math.round(m.yes_price * 100)
                return (
                  <Link key={m.id} href={`/markets/${m.id}`} className="flex items-center gap-3 group">
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                      <MarketImage
                        src={getMarketImage({ image_url: m.image_url, category: m.category, id: m.id })}
                        alt=""
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        category={m.category}
                        marketId={m.id}
                      />
                    </div>
                    <p className="flex-1 text-xs text-foreground line-clamp-1 group-hover:underline underline-offset-2 min-w-0">{m.title}</p>
                    <div className="shrink-0 text-right ml-2">
                      <p className="text-xs font-bold text-green-600">{yes}%</p>
                      <p className="text-xs text-muted-foreground">{fmtVol(m.volume_brl)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Hot Topics */}
          <div className="flex-1 p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <Flame className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-bold text-foreground">Hot Topics</h3>
            </div>
            <div className="space-y-2.5">
              {hotTopics.slice(0, 5).map((t, i) => (
                <Link key={t.category} href={`/?category=${t.category}`} className="flex items-center gap-3 group">
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                  <span className="w-8 text-center text-lg shrink-0">{categoryEmoji[t.category] || '📊'}</span>
                  <span className="flex-1 text-xs font-medium text-foreground group-hover:underline underline-offset-2">
                    {categoryLabel[t.category] || t.category}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{fmtVol(t.volume)}</span>
                  <Flame className="h-3 w-3 text-orange-400 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
