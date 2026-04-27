export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import BetPanel from '@/components/markets/BetPanel'
import PriceChart from '@/components/markets/PriceChart'
import { Clock, TrendingUp, Droplets } from 'lucide-react'
import type { Market, PriceHistory } from '@/types'

const categoryLabels: Record<string, string> = {
  politics: 'Politics', sports: 'Sports', economy: 'Economy',
  crypto: 'Crypto', entertainment: 'Entertainment', technology: 'Technology',
  world: 'World', weather: 'Weather',
}

function formatVolume(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MarketPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: market }, { data: history }, { data: { user } }] = await Promise.all([
    supabase.from('markets').select('*').eq('id', id).single(),
    supabase.from('price_history').select('*').eq('market_id', id).order('timestamp', { ascending: true }).limit(200),
    supabase.auth.getUser(),
  ])

  if (!market) notFound()

  let userBalance = 0
  let userPosition = null
  if (user) {
    const [{ data: profile }, { data: positions }] = await Promise.all([
      supabase.from('profiles').select('balance_brl').eq('id', user.id).single(),
      supabase.from('positions').select('*').eq('market_id', id).eq('user_id', user.id),
    ])
    userBalance = profile?.balance_brl ?? 0
    userPosition = positions
  }

  const m = market as Market
  const yesPercent = Math.round(m.yes_price * 100)
  const noPercent = 100 - yesPercent
  const isOpen = m.status === 'open'

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <a href="/" className="hover:text-foreground transition-colors">Home</a>
          <span>/</span>
          <span>{categoryLabels[m.category] || m.category}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Header card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                  {categoryLabels[m.category] || m.category}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  isOpen ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {m.status === 'open' ? '● Open' : m.status === 'closed' ? 'Closed' : 'Resolved'}
                </span>
                {m.outcome && (
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                    m.outcome === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    Result: {m.outcome === 'yes' ? 'YES' : 'NO'}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug mb-3">{m.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
            </div>

            {/* Probabilities */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center">
                  <div className="text-4xl font-bold text-green-600 mb-1">{yesPercent}%</div>
                  <div className="text-xs text-muted-foreground mb-1">Yes chance</div>
                  <div className="text-xs text-green-600 font-medium">${m.yes_price.toFixed(3)} / share</div>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center">
                  <div className="text-4xl font-bold text-red-500 mb-1">{noPercent}%</div>
                  <div className="text-xs text-muted-foreground mb-1">No chance</div>
                  <div className="text-xs text-red-500 font-medium">${m.no_price.toFixed(3)} / share</div>
                </div>
              </div>
              <div className="h-2 rounded-full bg-red-100 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${yesPercent}%` }} />
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Probability history</h2>
              <PriceChart data={(history as PriceHistory[]) || []} currentYesPrice={m.yes_price} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: 'Total volume', value: formatVolume(m.volume_brl) },
                { icon: Clock, label: 'Closes', value: formatDate(m.closes_at) },
                { icon: Droplets, label: 'Liquidity', value: `$${m.liquidity_b}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                  <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="text-sm font-semibold text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bet panel */}
          <div className="lg:col-span-1">
            <BetPanel
              market={m}
              userBalance={userBalance}
              userPosition={userPosition}
              isAuthenticated={!!user}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
