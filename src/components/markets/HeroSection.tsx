'use client'

import { useRealtimeMarkets } from '@/hooks/useRealtimeMarkets'
import Image from 'next/image'
import Link from 'next/link'
import type { Market } from '@/types'
import { getMarketImage, cleanTitle } from '@/lib/marketUtils'

interface Props {
  featured: Market
  trending: Market[]
}

const catColor: Record<string, string> = {
  politics: 'bg-blue-500/20 text-blue-300',
  sports: 'bg-orange-500/20 text-orange-300',
  crypto: 'bg-yellow-500/20 text-yellow-300',
  economy: 'bg-green-500/20 text-green-300',
  technology: 'bg-purple-500/20 text-purple-300',
  entertainment: 'bg-pink-500/20 text-pink-300',
  world: 'bg-gray-500/20 text-gray-300',
  weather: 'bg-sky-500/20 text-sky-300',
}

const catBg: Record<string, string> = {
  politics: 'from-blue-900',
  sports: 'from-orange-900',
  crypto: 'from-yellow-900',
  economy: 'from-emerald-900',
  technology: 'from-purple-900',
  entertainment: 'from-pink-900',
  world: 'from-gray-900',
  weather: 'from-sky-900',
}

function formatVolume(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

export default function HeroSection({ featured: initFeatured, trending: initTrending }: Props) {
  const { markets, flashIds } = useRealtimeMarkets([initFeatured, ...initTrending])

  const featured = markets[0] as Market
  const trending = markets.slice(1) as Market[]

  const yesP = Math.round(featured.yes_price * 100)
  const noP = 100 - yesP
  const bg = catBg[featured.category] || 'from-gray-900'
  const featuredImage = getMarketImage(featured)
  const featuredTitle = cleanTitle(featured.title)

  return (
    <div className="mb-8 space-y-3">
      {/* Featured market */}
      <Link href={`/markets/${featured.id}`} className="block group">
        <div className={`relative rounded-2xl overflow-hidden h-64 sm:h-72 bg-gradient-to-br ${bg} to-black`}>
          <Image
            src={featuredImage}
            alt={featuredTitle}
            fill
            className="object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-500"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Live badge */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="text-xs text-white/80 font-medium">LIVE</span>
          </div>

          {/* Category */}
          <div className="absolute top-4 left-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColor[featured.category] || catColor.world} backdrop-blur-sm`}>
              {featured.category.charAt(0).toUpperCase() + featured.category.slice(1)}
            </span>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white font-bold text-lg sm:text-xl leading-snug mb-3 line-clamp-2 drop-shadow">
              {featuredTitle}
            </p>

            {/* Probability */}
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-2xl font-bold text-green-400 transition-all duration-300 ${flashIds.has(featured.id) ? 'scale-110' : ''}`}>
                {yesP}%
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700"
                  style={{ width: `${yesP}%` }}
                />
              </div>
              <span className={`text-2xl font-bold text-red-400 transition-all duration-300 ${flashIds.has(featured.id) ? 'scale-110' : ''}`}>
                {noP}%
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-white/60">
              <span>{formatVolume(featured.volume_brl)} vol</span>
              {featured.total_bettors ? (
                <>
                  <span>·</span>
                  <span>{featured.total_bettors} bettors</span>
                </>
              ) : null}
              <span className="ml-auto text-white/40 group-hover:text-white/60 transition-colors text-xs font-medium">
                Bet now →
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Trending strip */}
      {trending.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trending.slice(0, 4).map((m) => {
            const yp = Math.round(m.yes_price * 100)
            const flashing = flashIds.has(m.id)
            const trendImg = getMarketImage(m)
            const trendTitle = cleanTitle(m.title)
            return (
              <Link key={m.id} href={`/markets/${m.id}`} className="group">
                <div className={`relative rounded-xl border overflow-hidden h-28 transition-all duration-300 ${flashing ? 'border-green-400/60 ring-1 ring-green-400/30' : 'border-border hover:border-foreground/40'}`}>
                  <Image
                    src={trendImg}
                    alt={trendTitle}
                    fill
                    className="object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-medium line-clamp-2 leading-snug mb-1.5">{trendTitle}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold text-green-400 transition-all duration-300 ${flashing ? 'scale-110' : ''}`}>
                        {yp}%
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all duration-700"
                          style={{ width: `${yp}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
