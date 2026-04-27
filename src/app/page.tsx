import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MarketCard from '@/components/markets/MarketCard'
import SearchBar from '@/components/markets/SearchBar'
import HeroTicker from '@/components/markets/HeroTicker'
import type { Market } from '@/types'

function formatVolume(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const { category, q, sort = 'volume' } = await searchParams
  const admin = await createAdminClient()

  // Platform stats + ticker markets
  const [{ data: markets }, { count: totalUsers }, { data: tickerMarkets }] = await Promise.all([
    (() => {
      let query = admin
        .from('markets')
        .select('*')
        .eq('status', 'open')

      if (category) query = query.eq('category', category)
      if (q) query = query.ilike('title', `%${q}%`)

      if (sort === 'newest') query = query.order('created_at', { ascending: false })
      else if (sort === 'closing') query = query.order('closes_at', { ascending: true })
      else query = query.order('volume_brl', { ascending: false })

      return query.limit(60)
    })(),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('markets').select('id, title, category, yes_price, image_url').eq('status', 'open').order('volume_brl', { ascending: false }).limit(20),
  ])

  const totalVolume = (markets || []).reduce((s, m) => s + (m.volume_brl || 0), 0)
  const featured = (!q && !category && sort === 'volume') ? (markets || []).slice(0, 3) : []
  const rest = featured.length > 0 ? (markets || []).slice(3) : (markets || [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero */}
        {!q && !category && (
          <div className="mb-8 rounded-2xl border border-border bg-card px-8 py-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Prediction Markets
            </p>
            <h1 className="text-4xl font-bold text-foreground mb-3 leading-tight">
              Predict the future.<br />
              <span className="text-muted-foreground font-normal">Earn real money.</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mb-8">
              Bet on real-world events. Prices reflect collective probability in real time.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-foreground">{markets?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Open markets</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-foreground">{formatVolume(totalVolume)}</p>
                <p className="text-xs text-muted-foreground">Total volume</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Traders</p>
              </div>
            </div>

            {/* Live ticker */}
            <HeroTicker markets={tickerMarkets || []} />
          </div>
        )}

        {/* Search + Filters */}
        <Suspense>
          <SearchBar />
        </Suspense>

        {/* Search result count */}
        {q && (
          <p className="text-sm text-muted-foreground mb-4">
            {markets?.length || 0} result{markets?.length !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-foreground">&quot;{q}&quot;</span>
          </p>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Featured</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map(market => (
                <MarketCard key={market.id} market={market as Market} featured />
              ))}
            </div>
          </section>
        )}

        {/* Market grid */}
        {rest.length > 0 && (
          <section>
            {!q && featured.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">All markets</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{rest.length}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rest.map(market => (
                <MarketCard key={market.id} market={market as Market} />
              ))}
            </div>
          </section>
        )}

        {/* Empty */}
        {!markets?.length && (
          <div className="text-center py-20">
            <p className="text-base font-medium text-foreground">
              {q ? 'No markets found' : 'No open markets yet'}
            </p>
            <p className="text-sm mt-1 text-muted-foreground">
              {q ? 'Try a different search or category' : 'Markets will appear here once created'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
