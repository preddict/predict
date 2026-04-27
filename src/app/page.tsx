import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MarketCard from '@/components/markets/MarketCard'
import type { Market } from '@/types'

const categories = [
  { value: '', label: 'All' },
  { value: 'politics', label: 'Politics' },
  { value: 'sports', label: 'Sports' },
  { value: 'economy', label: 'Economy' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'technology', label: 'Technology' },
  { value: 'world', label: 'World' },
]

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const { category, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('markets')
    .select('*')
    .eq('status', 'open')
    .order('volume_brl', { ascending: false })

  if (category) query = query.eq('category', category)
  if (q) query = query.ilike('title', `%${q}%`)

  const { data: markets } = await query.limit(50)
  const featured = markets?.slice(0, 3) || []
  const rest = markets?.slice(3) || []

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
            <p className="text-muted-foreground text-sm max-w-md">
              Bet on real-world events with other users. Prices reflect the collective market probability in real time.
            </p>
          </div>
        )}

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {categories.map(cat => {
            const isActive = category === cat.value || (!category && !cat.value)
            return (
              <a key={cat.value} href={cat.value ? `/?category=${cat.value}` : '/'}>
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                }`}>
                  {cat.label}
                </span>
              </a>
            )
          })}
        </div>

        {/* Search result */}
        {q && (
          <p className="text-sm text-muted-foreground mb-4">
            {markets?.length || 0} result(s) for <span className="font-medium text-foreground">&quot;{q}&quot;</span>
          </p>
        )}

        {/* Featured */}
        {featured.length > 0 && !q && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Featured</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map(market => (
                <MarketCard key={market.id} market={market as Market} />
              ))}
            </div>
          </section>
        )}

        {/* All markets */}
        {(rest.length > 0 || q) && (
          <section>
            {!q && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">All markets</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{rest.length} markets</span>
              </div>
            )}
            {markets?.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-base font-medium text-foreground">No markets found</p>
                <p className="text-sm mt-1 text-muted-foreground">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(q ? markets || [] : rest).map(market => (
                  <MarketCard key={market.id} market={market as Market} />
                ))}
              </div>
            )}
          </section>
        )}

        {!markets?.length && !q && (
          <div className="text-center py-20">
            <p className="text-base font-medium text-foreground">No open markets yet</p>
            <p className="text-sm mt-1 text-muted-foreground">Markets will appear here once created by the admin</p>
          </div>
        )}
      </main>
    </div>
  )
}
