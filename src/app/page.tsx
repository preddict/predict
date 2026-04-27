import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MarketCard from '@/components/markets/MarketCard'
import SearchBar from '@/components/markets/SearchBar'
import HeroPanel from '@/components/markets/HeroPanel'
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

  const [{ data: allOpen }, { count: totalUsers }] = await Promise.all([
    admin.from('markets').select('*').eq('status', 'open').order('volume_brl', { ascending: false }).limit(100),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  // Hero data from all open markets
  const featured = allOpen?.[0] || null
  const trending = allOpen?.slice(1, 7) || []

  const { data: featuredHistory } = featured
    ? await admin.from('price_history').select('yes_price, timestamp').eq('market_id', featured.id).order('timestamp', { ascending: true }).limit(60)
    : { data: [] }

  // Hot topics by category volume
  const categoryVolumes: Record<string, number> = {}
  for (const m of allOpen || []) {
    categoryVolumes[m.category] = (categoryVolumes[m.category] || 0) + (m.volume_brl || 0)
  }
  const hotTopics = Object.entries(categoryVolumes)
    .map(([category, volume]) => ({ category, volume }))
    .sort((a, b) => b.volume - a.volume)

  const totalVolume = (allOpen || []).reduce((s, m) => s + (m.volume_brl || 0), 0)

  // Filtered markets for grid
  let filtered = allOpen || []
  if (category) filtered = filtered.filter(m => m.category === category)
  if (q) filtered = filtered.filter(m => m.title.toLowerCase().includes(q.toLowerCase()))
  if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (sort === 'closing') filtered = [...filtered].sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())

  const showHero = !q && !category
  const featuredIds = new Set([featured?.id, ...trending.map(m => m.id)])
  const gridMarkets = showHero && sort === 'volume'
    ? filtered.filter(m => !featuredIds.has(m.id))
    : filtered

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero panel */}
        {showHero && (
          <HeroPanel
            featured={featured}
            history={featuredHistory || []}
            trending={trending as any}
            hotTopics={hotTopics}
            totalMarkets={allOpen?.length || 0}
            totalVolume={totalVolume}
            totalTraders={totalUsers || 0}
          />
        )}

        {/* Search + Filters */}
        <Suspense>
          <SearchBar />
        </Suspense>

        {/* Search result count */}
        {q && (
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-foreground">&quot;{q}&quot;</span>
          </p>
        )}

        {/* Market grid */}
        {gridMarkets.length > 0 ? (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {category ? categoryLabel(category) : q ? 'Results' : 'All markets'}
              </span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{gridMarkets.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gridMarkets.map(market => (
                <MarketCard key={market.id} market={market as Market} />
              ))}
            </div>
          </section>
        ) : (
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

function categoryLabel(cat: string) {
  const labels: Record<string, string> = {
    politics: 'Politics', sports: 'Sports', economy: 'Economy', crypto: 'Crypto',
    entertainment: 'Entertainment', technology: 'Technology', world: 'World', weather: 'Weather',
  }
  return labels[cat] || cat
}
