'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import PortfolioStats from '@/components/portfolio/PortfolioStats'
import PositionCard from '@/components/portfolio/PositionCard'
import TransactionHistory from '@/components/portfolio/TransactionHistory'
import DepositButton from '@/components/portfolio/DepositButton'
import WithdrawButton from '@/components/portfolio/WithdrawButton'
import DepositToast from '@/components/portfolio/DepositToast'

type Tab = 'open' | 'resolved' | 'history'

function PortfolioContent() {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const searchParams = useSearchParams()
  const deposit = searchParams.get('deposit') || undefined

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('open')

  function fetchPortfolio() {
    if (!authenticated) { setLoading(false); return }
    getAccessToken().then(token =>
      fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    )
  }

  useEffect(() => {
    if (!ready) return
    if (!authenticated) { setLoading(false); return }

    getAccessToken().then(token =>
      fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    )
  }, [ready, authenticated, getAccessToken])

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-sm text-muted-foreground">Sign in to view your portfolio</p>
        </div>
      </div>
    )
  }

  const { profile, openPositions = [], resolvedPositions = [], transactions = [], invested = 0, currentValue = 0, resolvedPnl = 0 } = data || {}

  const wins = resolvedPositions.filter((p: any) => p.market?.outcome === p.side).length
  const winRate = resolvedPositions.length > 0 ? (wins / resolvedPositions.length) * 100 : -1

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'open', label: 'Open', count: openPositions.length },
    { key: 'resolved', label: 'Resolved', count: resolvedPositions.length },
    { key: 'history', label: 'History', count: transactions.length },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <DepositToast status={deposit} />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back</p>
          </div>
          <div className="flex items-center gap-2">
            <WithdrawButton balance={profile?.balance_brl || 0} onSuccess={fetchPortfolio} />
            <DepositButton />
          </div>
        </div>

        <PortfolioStats
          balance={profile?.balance_brl || 0}
          invested={invested}
          currentValue={currentValue}
          resolvedPnl={resolvedPnl}
          winRate={winRate}
        />

        {/* Tabs */}
        <div className="mt-10 flex gap-1 border-b border-border mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'open' && (
          openPositions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
              No open positions yet.{' '}
              <a href="/" className="text-foreground underline underline-offset-2">Browse markets</a> to place your first bet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPositions.map((p: any) => <PositionCard key={p.id} position={p} onRefresh={fetchPortfolio} />)}
            </div>
          )
        )}

        {tab === 'resolved' && (
          resolvedPositions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
              No resolved positions yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resolvedPositions.map((p: any) => <PositionCard key={p.id} position={p} />)}
            </div>
          )
        )}

        {tab === 'history' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <TransactionHistory transactions={transactions} />
          </div>
        )}
      </main>
    </div>
  )
}

export default function PortfolioPage() {
  return <Suspense><PortfolioContent /></Suspense>
}
