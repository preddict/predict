import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import { TrendingUp, TrendingDown, Calendar, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params
  const admin = await createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .single()

  const name = profile?.name?.trim() || profile?.email?.split('@')[0] || 'Trader'
  return {
    title: `${name}'s Profile`,
    description: `View ${name}'s prediction market portfolio and trading history on PREDICT.`,
  }
}

function displayName(profile: { name?: string | null; email?: string | null }) {
  if (profile.name?.trim()) return profile.name
  if (profile.email) {
    const local = profile.email.split('@')[0]
    return local.length > 12 ? local.slice(0, 10) + '…' : local
  }
  return 'Trader'
}

function initials(profile: { name?: string | null; email?: string | null }) {
  if (profile.name?.trim()) return profile.name[0].toUpperCase()
  if (profile.email) return profile.email[0].toUpperCase()
  return 'T'
}

function formatPnl(v: number) {
  const abs = Math.abs(v)
  const str = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(2)}`
  return { text: v >= 0 ? `+${str}` : `-${str}`, positive: v >= 0 }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const categoryColors: Record<string, string> = {
  politics: 'bg-blue-100 text-blue-700',
  sports: 'bg-orange-100 text-orange-700',
  crypto: 'bg-yellow-100 text-yellow-700',
  economy: 'bg-green-100 text-green-700',
  technology: 'bg-purple-100 text-purple-700',
  entertainment: 'bg-pink-100 text-pink-700',
  world: 'bg-gray-100 text-gray-600',
  weather: 'bg-sky-100 text-sky-700',
}

export default async function ProfilePage({ params }: PageProps) {
  const { userId } = await params
  const admin = await createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, created_at')
    .eq('id', userId)
    .single()

  if (!profile) notFound()

  const [{ data: positions }, { data: txs }] = await Promise.all([
    admin
      .from('positions')
      .select('id, side, shares, avg_price, market_id, market:markets(id, title, category, status, outcome, yes_price, no_price)')
      .eq('user_id', userId)
      .gt('shares', 0),
    admin
      .from('transactions')
      .select('type, amount_brl')
      .eq('user_id', userId)
      .in('type', ['payout', 'buy']),
  ])

  const totalPayouts = (txs || []).filter((t: any) => t.type === 'payout').reduce((s: number, t: any) => s + t.amount_brl, 0)
  const totalBuys = (txs || []).filter((t: any) => t.type === 'buy').reduce((s: number, t: any) => s + t.amount_brl, 0)
  const pnl = totalPayouts - totalBuys

  const resolved = (positions || []).filter((p: any) => p.market?.status === 'resolved')
  const wins = resolved.filter((p: any) => p.market?.outcome === p.side).length
  const winRate = resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : null
  const open = (positions || []).filter((p: any) => p.market?.status !== 'resolved')
  const marketsCount = new Set((positions || []).map((p: any) => p.market_id)).size

  const pnlFmt = formatPnl(pnl)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Profile header */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center text-2xl font-bold text-background shrink-0">
            {initials(profile)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">{displayName(profile)}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Member since {formatDate(profile.created_at)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: 'Profit / Loss',
              value: pnlFmt.text,
              color: pnlFmt.positive ? 'text-green-500' : 'text-red-500',
              icon: pnlFmt.positive ? TrendingUp : TrendingDown,
            },
            {
              label: 'Win Rate',
              value: winRate !== null ? `${winRate}%` : '—',
              color: winRate !== null ? (winRate >= 50 ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground',
              icon: BarChart2,
            },
            {
              label: 'Markets',
              value: marketsCount,
              color: 'text-foreground',
              icon: BarChart2,
            },
            {
              label: 'Volume',
              value: totalBuys >= 1000 ? `$${(totalBuys / 1000).toFixed(1)}k` : `$${totalBuys.toFixed(0)}`,
              color: 'text-foreground',
              icon: TrendingUp,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className={`text-lg font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Open positions */}
        {open.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Open Positions
              <span className="text-xs text-muted-foreground font-normal">{open.length}</span>
            </h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {open.map((p: any) => (
                <Link key={p.id} href={`/markets/${p.market?.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.side === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {p.side.toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-foreground line-clamp-1">{p.market?.title}</span>
                  <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded ${categoryColors[p.market?.category] || 'bg-muted text-muted-foreground'}`}>
                    {p.market?.category}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Resolved positions */}
        {resolved.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              Resolved
              <span className="text-xs text-muted-foreground font-normal">{resolved.length}</span>
            </h2>
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {resolved.map((p: any) => {
                const won = p.market?.outcome === p.side
                return (
                  <Link key={p.id} href={`/markets/${p.market?.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {won ? 'WON' : 'LOST'}
                    </span>
                    <span className="flex-1 text-sm text-foreground line-clamp-1">{p.market?.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.side.toUpperCase()}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {positions?.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">No positions yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
