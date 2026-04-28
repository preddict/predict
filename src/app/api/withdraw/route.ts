import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveProfile } from '@/lib/resolveProfile'

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

    const { amount } = await req.json()
    const amountNum = parseFloat(amount)

    if (!amountNum || amountNum < 1) {
      return NextResponse.json({ error: 'Minimum withdrawal is $1.00' }, { status: 400 })
    }
    if (amountNum > profile.balance_brl) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }
    if (!profile.wallet_address) {
      return NextResponse.json({ error: 'No wallet address found' }, { status: 400 })
    }

    // Deduct balance immediately and create pending withdrawal
    await admin.from('profiles').update({
      balance_brl: profile.balance_brl - amountNum,
    }).eq('id', profile.id)

    await admin.from('transactions').insert({
      user_id: profile.id,
      type: 'withdraw',
      amount_brl: amountNum,
      status: 'pending',
      metadata: { wallet: profile.wallet_address, network: 'polygon', token: 'USDC' },
    })

    return NextResponse.json({ success: true, amount: amountNum, wallet: profile.wallet_address })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
