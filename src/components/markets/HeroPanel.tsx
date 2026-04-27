'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Flame } from 'lucide-react'

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

interface PricePoint {
  yes_price: number
  timestamp: string
}

interface TrendingMarket {
  id: string
  title: string
  yes_price: number
  volume_brl: number
  image_url: string | null
}

interface HotTopic {
  category: string
  volume: number
}

interface Props {
  featured: FeaturedMarket | null
  history: PricePoint[]
  trending: TrendingMarket[]
  hotTopics: HotTopic[]
  totalMarkets: number
  totalVolume: number
  totalTraders: number
}

const categoryEmoji: Record<string, string> = {
  politics: '🏛️', sports: '🏆', economy: '📈', crypto: '₿',
  entertainment: '🎬', technology: '💻', world: '🌍', weather: '🌤️',
}

const categoryLabel: Record<string, string> = {
  politics: 'Politics', sports: 'Sports', economy: 'Economy', crypto: 'Crypto',
  entertainment: 'Entertainment', technology: 'Technology', world: 'World', weather: 'Weather',
}

function formatVolume(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow">
      <span className="font-semibold text-green-600">{Math.round(payload[0].value * 100)}%</span>
    </div>
  )
}

export default function HeroPanel({ featured, history, trending, hotTopics, totalMarkets, totalVolume, totalTraders }: Props) {
  const chartData = history.map(h => ({ v: h.yes_price }))
  const yesPercent = featured ? Math.round(featured.yes_price * 100) : 0
  const noPercent = 100 - yesPercent

  // Price trend from history
  const priceChange = history.length >= 2
    ? (history[history.length - 1].yes_price - history[0].yes_price) * 100
    : 0

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card overflow-hidden">

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">Live markets</span>
        </div>
        <div className="flex gap-6 ml-2">
          <div><span className="text-sm font-bold text-foreground">{totalMarkets}</span><span className="text-xs text-muted-foreground ml-1">open</span></div>
          <div><span className="text-sm font-bold text-foreground">{formatVolume(totalVolume)}</span><span className="text-xs text-muted-foreground ml-1">volume</span></div>
          <div><span className="text-sm font-bold text-foreground">{totalTraders}</span><span className="text-xs text-muted-foreground ml-1">traders</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5">

        {/* Featured market */}
        {featured && (
          <Link href={`/markets/${featured.id}`} className="lg:col-span-3 block p-6 border-b lg:border-b-0 lg:border-r border-border hover:bg-muted/20 transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                {featured.image_url
                  ? <Image src={featured.image_url} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
                  : <span className="text-sm">{categoryEmoji[featured.category] || '📊'}</span>}
              </div>
              <span className="text-xs text-muted-foreground font-medium">{categoryLabel[featured.category] || featured.category}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatVolume(featured.volume_brl)} Vol</span>
            </div>

            <h2 className="text-xl font-bold text-foreground leading-snug mb-5 group-hover:underline underline-offset-2">
              {featured.title}
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <p className="text-xs text-muted-foreground mb-1">YES</p>
                <p className="text-3xl font-bold text-green-600">{yesPercent}%</p>
                {priceChange !== 0 && (
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${priceChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
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

            {/* Sparkline */}
            {chartData.length > 1 && (
              <div className="h-24 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="v" stroke="#16a34a" strokeWidth={2} fill="url(#heroGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3">Ends {formatDate(featured.closes_at)}</p>
          </Link>
        )}

        {/* Right panel */}
        <div className="lg:col-span-2 flex flex-col divide-y divide-border">

          {/* Trending */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">Trending</h3>
              <Link href="/?sort=volume" className="text-xs text-muted-foreground hover:text-foreground transition-colors">See all →</Link>
            </div>
            <div className="space-y-3">
              {trending.slice(0, 5).map((m, i) => {
                const yes = Math.round(m.yes_price * 100)
                return (
                  <Link key={m.id} href={`/markets/${m.id}`} className="flex items-center gap-3 group">
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="w-6 h-6 rounded-md overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                      {m.image_url
                        ? <Image src={m.image_url} alt="" width={24} height={24} className="w-full h-full object-cover" unoptimized />
                        : <span className="text-xs">📊</span>}
                    </div>
                    <p className="flex-1 text-xs text-foreground line-clamp-1 group-hover:underline underline-offset-2">{m.title}</p>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-foreground">{yes}%</p>
                      <p className="text-xs text-muted-foreground">{formatVolume(m.volume_brl)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Hot Topics */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-500" /> Hot Topics
              </h3>
            </div>
            <div className="space-y-2.5">
              {hotTopics.slice(0, 5).map((t, i) => (
                <Link key={t.category} href={`/?category=${t.category}`} className="flex items-center gap-3 group">
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <span className="text-sm">{categoryEmoji[t.category] || '📊'}</span>
                  <span className="flex-1 text-xs font-medium text-foreground group-hover:underline underline-offset-2">
                    {categoryLabel[t.category] || t.category}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatVolume(t.volume)}</span>
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
