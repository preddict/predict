import { createAdminClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react'

function formatPnl(v: number) {
  const abs = Math.abs(v)
  const str = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(2)}`
  return v >= 0 ? `+${str}` : `-${str}`
}

function displayName(profile: { name?: string | null; email?: string | null }) {
  if (profile.name && profile.name.trim()) {
    return profile.name.split(' ')[0]
  }
  if (profile.email) {
    const local = profile.email.split('@')[0]
    return local.length > 8 ? local.slice(0, 6) + '…' : local
  }
  return 'Trader'
}

function initials(profile: { name?: string | null; email?: string | null }) {
  if (profile.name && profile.name.trim()) return profile.name[0].toUpperCase()
  if (profile.email) return profile.email[0].toUpperCase()
  return 'T'
}

const medalColors = ['#F59E0B', '#9CA3AF', '#B45309']
const medalLabels = ['1st', '2nd', '3rd']

export default async function LeaderboardPage() {
  const admin = await createAdminClient()

  const [{ data: txs }, { data: resolvedMarkets }, { data: allPositions }] = await Promise.all([
    admin.from('transactions').select('user_id, type, amount_brl').in('type', ['payout', 'buy']),
    admin.from('markets').select('id, outcome').eq('status', 'resolved'),
    admin.from('positions').select('user_id, side, market_id').gt('shares', 0),
  ])

  // P&L and volume per user
  const pnlMap = new Map<string, { payouts: number; buys: number }>()
  for (const tx of txs || []) {
    const cur = pnlMap.get(tx.user_id) || { payouts: 0, buys: 0 }
    if (tx.type === 'payout') cur.payouts += tx.amount_brl
    if (tx.type === 'buy') cur.buys += tx.amount_brl
    pnlMap.set(tx.user_id, cur)
  }

  // Win rate per user from resolved positions
  const resolvedMap = new Map((resolvedMarkets || []).map(m => [m.id, m.outcome]))
  const winMap = new Map<string, { wins: number; total: number }>()
  const marketsMap = new Map<string, Set<string>>()

  for (const pos of allPositions || []) {
    const outcome = resolvedMap.get(pos.market_id)
    if (outcome !== undefined) {
      const cur = winMap.get(pos.user_id) || { wins: 0, total: 0 }
      cur.total++
      if (outcome === pos.side) cur.wins++
      winMap.set(pos.user_id, cur)
    }
    const markets = marketsMap.get(pos.user_id) || new Set()
    markets.add(pos.market_id)
    marketsMap.set(pos.user_id, markets)
  }

  const userIds = [...pnlMap.keys()]
  if (userIds.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="text-muted-foreground text-sm">No traders yet. Be the first!</p>
        </main>
      </div>
    )
  }

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, email, avatar_url')
    .in('id', userIds)

  const rows = (profiles || [])
    .filter(p => (pnlMap.get(p.id)?.buys || 0) > 0) // only users who actually bet
    .map(p => {
      const { payouts = 0, buys = 0 } = pnlMap.get(p.id) || {}
      const win = winMap.get(p.id) || { wins: 0, total: 0 }
      return {
        id: p.id,
        name: displayName(p),
        initials: initials(p),
        pnl: payouts - buys,
        volume: buys,
        winRate: win.total > 0 ? Math.round((win.wins / win.total) * 100) : null,
        markets: marketsMap.get(p.id)?.size || 0,
      }
    })
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 50)

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  // Reorder for podium: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumOrder = top3[1] ? [1, 0, 2] : top3[0] ? [0] : []

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">

        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Top traders ranked by realized profit &amp; loss</p>
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-3 mb-10">
            {podium.map((trader, i) => {
              const rank = podiumOrder[i]
              const isFist = rank === 0
              return (
                <div
                  key={trader.id}
                  className={`flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-5 transition-all ${
                    isFist ? 'flex-1 max-w-[200px] scale-105 shadow-lg shadow-black/10' : 'flex-1 max-w-[160px]'
                  }`}
                >
                  <div
                    className="text-xs font-bold mb-3 px-2.5 py-0.5 rounded-full"
                    style={{ background: medalColors[rank] + '22', color: medalColors[rank] }}
                  >
                    {medalLabels[rank]}
                  </div>
                  <div
                    className={`rounded-full flex items-center justify-center font-bold text-background mb-2 ${isFist ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base'}`}
                    style={{ background: medalColors[rank] }}
                  >
                    {trader.initials}
                  </div>
                  <p className={`font-semibold text-foreground text-center ${isFist ? 'text-base' : 'text-sm'}`}>{trader.name}</p>
                  <p className={`font-bold mt-1 ${trader.pnl >= 0 ? 'text-green-500' : 'text-red-500'} ${isFist ? 'text-xl' : 'text-base'}`}>
                    {formatPnl(trader.pnl)}
                  </p>
                  {trader.winRate !== null && (
                    <p className="text-xs text-muted-foreground mt-1">{trader.winRate}% win rate</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Full table */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground px-5 py-3 w-12">#</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground px-4 py-3">Trader</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground px-4 py-3">P&amp;L</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground px-4 py-3 hidden sm:table-cell">Volume</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground px-4 py-3 hidden md:table-cell">Win Rate</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground px-5 py-3 hidden md:table-cell">Markets</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((trader, i) => (
                  <tr
                    key={trader.id}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${i < 3 ? 'bg-muted/20' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs font-bold"
                        style={i < 3 ? { color: medalColors[i] } : { color: '' }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-background shrink-0"
                          style={{ background: i < 3 ? medalColors[i] : '#6B7280' }}
                        >
                          {trader.initials}
                        </div>
                        <span className="font-medium text-foreground">{trader.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {trader.pnl >= 0
                          ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        }
                        <span className={`font-semibold ${trader.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPnl(trader.pnl)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground hidden sm:table-cell">
                      ${trader.volume >= 1000 ? `${(trader.volume / 1000).toFixed(1)}k` : trader.volume.toFixed(0)}
                    </td>
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
                      {trader.winRate !== null ? (
                        <span className={trader.winRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                          {trader.winRate}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground hidden md:table-cell">
                      {trader.markets}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <p className="text-sm text-muted-foreground">No traders yet. Place the first bet!</p>
          </div>
        )}
      </main>
    </div>
  )
}
