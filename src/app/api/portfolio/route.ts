import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await privy.verifyAuthToken(token)
    const admin = await createAdminClient()

    const { data: profile } = await admin
      .from('profiles').select('*').eq('privy_id', claims.userId).single()

    if (!profile) return NextResponse.json({ profile: null, openPositions: [], resolvedPositions: [], transactions: [], invested: 0, currentValue: 0, resolvedPnl: 0 })

    const [{ data: positions }, { data: transactions }] = await Promise.all([
      admin.from('positions').select(`id, market_id, side, shares, avg_price, market:markets(id, title, category, yes_price, no_price, status, outcome)`).eq('user_id', profile.id).gt('shares', 0),
      admin.from('transactions').select(`id, type, amount_brl, status, created_at, market:markets(title)`).eq('user_id', profile.id).order('created_at', { ascending: false }).limit(100),
    ])

    const open = (positions || []).filter((p: any) => p.market?.status !== 'resolved')
    const resolved = (positions || []).filter((p: any) => p.market?.status === 'resolved')

    const invested = open.reduce((s: number, p: any) => s + p.shares * p.avg_price, 0)
    const currentValue = open.reduce((s: number, p: any) => {
      const price = p.side === 'yes' ? p.market.yes_price : p.market.no_price
      return s + p.shares * price
    }, 0)

    const resolvedPnl = (transactions || [])
      .filter((t: any) => t.type === 'payout')
      .reduce((s: number, t: any) => s + t.amount_brl, 0)

    return NextResponse.json({ profile, openPositions: open, resolvedPositions: resolved, transactions: transactions || [], invested, currentValue, resolvedPnl })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
