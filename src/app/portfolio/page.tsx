export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import PortfolioStats from '@/components/portfolio/PortfolioStats'
import PositionCard from '@/components/portfolio/PositionCard'
import TransactionHistory from '@/components/portfolio/TransactionHistory'
import DepositButton from '@/components/portfolio/DepositButton'
import DepositToast from '@/components/portfolio/DepositToast'

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ deposit?: string }> }) {
  const { deposit } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/portfolio')

  const [{ data: profile }, { data: positions }, { data: transactions }] = await Promise.all([
    supabase.from('profiles').select('balance_brl, name').eq('id', user.id).single(),
    supabase.from('positions').select(`
      id, market_id, side, shares, avg_price,
      market:markets(id, title, category, yes_price, no_price, status, outcome)
    `).eq('user_id', user.id).gt('shares', 0).order('created_at', { ascending: false }),
    supabase.from('transactions').select(`
      id, type, amount_brl, status, created_at,
      market:markets(title)
    `).eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
  ])

  const balance = profile?.balance_brl || 0

  const openPositions = (positions || []).filter((p: any) => p.market?.status !== 'resolved')
  const resolvedPositions = (positions || []).filter((p: any) => p.market?.status === 'resolved')

  const invested = openPositions.reduce((s: number, p: any) => s + p.shares * p.avg_price, 0)
  const currentValue = openPositions.reduce((s: number, p: any) => {
    const price = p.side === 'yes' ? p.market.yes_price : p.market.no_price
    return s + p.shares * price
  }, 0)

  const resolvedPnl = (transactions || [])
    .filter((t: any) => t.type === 'payout')
    .reduce((s: number, t: any) => s + t.amount_brl, 0)
    - (transactions || [])
      .filter((t: any) => t.type === 'buy' && resolvedPositions.some((p: any) => p.market_id === t.market_id))
      .reduce((s: number, t: any) => s + t.amount_brl, 0)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <DepositToast status={deposit} />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {profile?.name || user.email}
            </p>
          </div>
          <DepositButton />
        </div>

        <PortfolioStats
          balance={balance}
          invested={invested}
          currentValue={currentValue}
          resolvedPnl={resolvedPnl}
        />

        <div className="mt-10 space-y-8">
          {/* Open positions */}
          <section>
            <h2 className="text-sm font-semibold mb-4">
              Open Positions
              <span className="ml-2 text-muted-foreground font-normal">({openPositions.length})</span>
            </h2>
            {openPositions.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No open positions yet.{' '}
                <a href="/" className="text-foreground underline underline-offset-2">Browse markets</a> to place your first bet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {openPositions.map((p: any) => <PositionCard key={p.id} position={p} />)}
              </div>
            )}
          </section>

          {/* Resolved positions */}
          {resolvedPositions.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-4">
                Resolved Positions
                <span className="ml-2 text-muted-foreground font-normal">({resolvedPositions.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resolvedPositions.map((p: any) => <PositionCard key={p.id} position={p} />)}
              </div>
            </section>
          )}

          {/* Transaction history */}
          <section>
            <h2 className="text-sm font-semibold mb-4">Transaction History</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <TransactionHistory transactions={(transactions || []) as any} />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
