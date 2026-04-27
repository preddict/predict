import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MarketCard from '@/components/markets/MarketCard'
import SearchBar from '@/components/markets/SearchBar'
import HeroSection from '@/components/markets/HeroSection'
import type { Market } from '@/types'

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>
}

const catLabel = (cat: string) => ({
  politics: 'Politics', sports: 'Sports', economy: 'Economy', crypto: 'Crypto',
  entertainment: 'Entertainment', technology: 'Technology', world: 'World', weather: 'Weather',
}[cat] || cat)

export default async function HomePage({ searchParams }: PageProps) {
  const { category, q, sort = 'volume' } = await searchParams
  const admin = await createAdminClient()

  const { data: allOpen } = await admin
    .from('markets')
    .select('*')
    .eq('status', 'open')
    .order('polymarket_volume', { ascending: false })
    .limit(200)

  let filtered = allOpen || []
  if (category) filtered = filtered.filter(m => m.category === category)
  if (q) filtered = filtered.filter(m => m.title.toLowerCase().includes(q.toLowerCase()))
  if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (sort === 'closing') filtered = [...filtered].sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())
  if (sort === 'volume') filtered = [...filtered].sort((a, b) => (b.volume_brl || 0) - (a.volume_brl || 0))

  // Top markets for hero — highest polymarket_volume with images
  const heroMarkets = (allOpen || [])
    .filter(m => m.image_url)
    .slice(0, 5)

  const featured = heroMarkets[0] as Market | undefined
  const trending = heroMarkets.slice(1, 5) as Market[]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero — only on home, not when searching/filtering */}
        {!q && !category && featured && (
          <HeroSection featured={featured} trending={trending} />
        )}

        <Suspense>
          <SearchBar />
        </Suspense>

        {q && (
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for{' '}
            <span className="font-medium text-foreground">&quot;{q}&quot;</span>
          </p>
        )}

        {filtered.length > 0 ? (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {category ? catLabel(category) : q ? 'Results' : 'All markets'}
              </span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{filtered.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(market => (
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
