import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { lmsrPrice } from '@/lib/lmsr'

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
      .from('profiles').select('is_admin').eq('privy_id', claims.userId).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { title, description, category, closes_at, liquidity_b } = await req.json()
    if (!title || !category || !closes_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const b = parseFloat(liquidity_b) || 200
    const { yes: yes_price, no: no_price } = lmsrPrice(0, 0, b)

    const { data, error } = await admin.from('markets').insert({
      title,
      description: description || null,
      category,
      closes_at: new Date(closes_at).toISOString(),
      liquidity_b: b,
      q_yes: 0,
      q_no: 0,
      yes_price,
      no_price,
      status: 'open',
      volume_brl: 0,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ market: data })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
