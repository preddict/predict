import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MarketCard from '@/components/markets/MarketCard'
import SearchBar from '@/components/markets/SearchBar'
import type { Market } from '@/types'

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>
}

const catLabel = (cat: string) => ({
  politics: 'Politics', sports: 'Sports', economy: 'Economy', crypto: 'Crypto',
  entertainment: 'Entertainment', technology: 'Technology', world: 'World', weather: 'Weather',
}[cat] || cat)

function formatVolume(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

export default async function HomePage({ searchParams }: PageProps) {
  const { category, q, sort = 'volume' } = await searchParams
  const admin = await createAdminClient()

  const [{ data: allOpen }, { count: totalUsers }] = await Promise.all([
    admin.from('markets').select('*').eq('status', 'open').order('volume_brl', { ascending: false }).limit(100),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const totalVolume = (allOpen || []).reduce((s, m) => s + (m.volume_brl || 0), 0)

  let filtered = allOpen || []
  if (category) filtered = filtered.filter(m => m.category === category)
  if (q) filtered = filtered.filter(m => m.title.toLowerCase().includes(q.toLowerCase()))
  if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (sort === 'closing') filtered = [...filtered].sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())

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
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-bold text-foreground">{allOpen?.length || 0}</p>
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
          </div>
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
