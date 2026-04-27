import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

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

    const { data: profile } = await admin.from('profiles').select('is_admin').eq('privy_id', claims.userId).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { marketId, outcome } = await req.json()
    if (!marketId || !outcome) return NextResponse.json({ error: 'Missing marketId or outcome' }, { status: 400 })
    if (!['yes', 'no'].includes(outcome)) return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })

    const { error } = await admin.rpc('resolve_market', { p_market_id: marketId, p_outcome: outcome })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get market title and all position holders to notify
    const { data: market } = await admin.from('markets').select('title').eq('id', marketId).single()
    const { data: positions } = await admin
      .from('positions')
      .select('user_id, side')
      .eq('market_id', marketId)
      .gt('shares', 0)

    if (market && positions && positions.length > 0) {
      const notifications = positions.map((p: any) => {
        const won = p.side === outcome
        return {
          user_id: p.user_id,
          type: 'market_resolved',
          title: won ? '🎉 You won!' : '❌ Market resolved',
          body: `${market.title} — ${outcome.toUpperCase()} won. ${won ? 'Your winnings have been credited.' : 'Better luck next time.'}`,
          market_id: marketId,
          read: false,
        }
      })
      await admin.from('notifications').insert(notifications)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
