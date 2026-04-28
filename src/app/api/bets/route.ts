import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveProfile } from '@/lib/resolveProfile'
import { calculateBuyCost, sharesForAmount } from '@/lib/lmsr'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await privy.verifyAuthToken(token)
    const admin = await createAdminClient()

    const profile = await resolveProfile(admin, claims.userId)

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { marketId, side, amountBrl } = await req.json()

    if (!marketId || !side || !amountBrl) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    if (!['yes', 'no'].includes(side)) {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
    }
    if (amountBrl < 1) {
      return NextResponse.json({ error: 'Minimum bet is $1.00' }, { status: 400 })
    }
    if (profile.balance_brl < amountBrl) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    const { data: market } = await admin
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single()

    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    if (market.status !== 'open') return NextResponse.json({ error: 'Market is not open' }, { status: 400 })

    const qYes = market.q_yes ?? 0
    const qNo = market.q_no ?? 0
    const b = market.liquidity_b ?? 100

    const shares = sharesForAmount(qYes, qNo, b, side, amountBrl)
    const { cost, newYesPrice, newNoPrice } = calculateBuyCost(qYes, qNo, b, side, shares)

    const newQYes = side === 'yes' ? qYes + shares : qYes
    const newQNo = side === 'no' ? qNo + shares : qNo

    const { error: betErr } = await admin.rpc('execute_bet', {
      p_user_id: profile.id,
      p_market_id: marketId,
      p_side: side,
      p_shares: shares,
      p_cost: cost,
      p_new_q_yes: newQYes,
      p_new_q_no: newQNo,
      p_new_yes_price: newYesPrice,
      p_new_no_price: newNoPrice,
    })

    if (betErr) return NextResponse.json({ error: betErr.message }, { status: 400 })

    try { await admin.rpc('refresh_market_bettors', { p_market_id: marketId }) } catch { /* silent */ }

    return NextResponse.json({ success: true, shares, cost, newYesPrice, newNoPrice })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
