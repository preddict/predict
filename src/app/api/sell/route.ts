import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateSellReturn } from '@/lib/lmsr'

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

    const { data: profile } = await admin
      .from('profiles')
      .select('id, balance_brl')
      .eq('privy_id', claims.userId)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { marketId, side, shares } = await req.json()

    if (!marketId || !side || !shares || shares <= 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    if (!['yes', 'no'].includes(side)) {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
    }

    const { data: market } = await admin.from('markets').select('*').eq('id', marketId).single()
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    if (market.status !== 'open') return NextResponse.json({ error: 'Market is not open' }, { status: 400 })

    const { data: position } = await admin
      .from('positions')
      .select('shares')
      .eq('user_id', profile.id)
      .eq('market_id', marketId)
      .eq('side', side)
      .single()

    if (!position || position.shares < shares) {
      return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 })
    }

    const qYes = market.q_yes ?? 0
    const qNo = market.q_no ?? 0
    const b = market.liquidity_b ?? 100

    const { returnAmount, newYesPrice, newNoPrice } = calculateSellReturn(qYes, qNo, b, side, shares)

    const newQYes = side === 'yes' ? qYes - shares : qYes
    const newQNo = side === 'no' ? qNo - shares : qNo

    const { error: sellErr } = await admin.rpc('execute_sell', {
      p_user_id: profile.id,
      p_market_id: marketId,
      p_side: side,
      p_shares: shares,
      p_return: returnAmount,
      p_new_q_yes: newQYes,
      p_new_q_no: newQNo,
      p_new_yes_price: newYesPrice,
      p_new_no_price: newNoPrice,
    })

    if (sellErr) return NextResponse.json({ error: sellErr.message }, { status: 400 })

    return NextResponse.json({ success: true, returnAmount, newYesPrice, newNoPrice })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
