import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const admin = await createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, created_at')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: positions }, { data: txs }] = await Promise.all([
    admin
      .from('positions')
      .select('id, side, shares, avg_price, market_id, market:markets(id, title, category, status, outcome, yes_price, no_price)')
      .eq('user_id', userId)
      .gt('shares', 0)
      .order('market_id'),
    admin
      .from('transactions')
      .select('type, amount_brl')
      .eq('user_id', userId)
      .in('type', ['payout', 'buy']),
  ])

  // P&L
  const totalPayouts = (txs || []).filter((t: any) => t.type === 'payout').reduce((s: number, t: any) => s + t.amount_brl, 0)
  const totalBuys = (txs || []).filter((t: any) => t.type === 'buy').reduce((s: number, t: any) => s + t.amount_brl, 0)
  const pnl = totalPayouts - totalBuys

  // Win rate from resolved positions
  const resolved = (positions || []).filter((p: any) => p.market?.status === 'resolved')
  const wins = resolved.filter((p: any) => p.market?.outcome === p.side).length
  const winRate = resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : null

  const open = (positions || []).filter((p: any) => p.market?.status !== 'resolved')
  const marketsCount = new Set((positions || []).map((p: any) => p.market_id)).size

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      created_at: profile.created_at,
    },
    stats: { pnl, totalBuys, winRate, wins, totalResolved: resolved.length, marketsCount },
    openPositions: open,
    resolvedPositions: resolved,
  })
}
