import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveProfile } from '@/lib/resolveProfile'
import { sendDepositConfirmedEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await privy.verifyAuthToken(token)
    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ credited: 0, message: 'Payment not completed' })
    }

    const admin = await createAdminClient()

    const profile = await resolveProfile(admin, claims.userId)

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Check if this session was already credited (avoid double credit)
    const { data: existing } = await admin
      .from('transactions')
      .select('id')
      .eq('user_id', profile.id)
      .contains('metadata', { stripe_session_id: sessionId })
      .single()

    if (existing) {
      return NextResponse.json({ credited: 0, message: 'Already credited' })
    }

    const amountUsd = parseFloat(session.metadata?.amount_usd || '0') ||
      (session.amount_total ? session.amount_total / 100 : 0)

    if (amountUsd < 0.01) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    await admin.rpc('add_balance', { p_user_id: profile.id, p_amount: amountUsd })

    await admin.from('transactions').insert({
      user_id: profile.id,
      type: 'deposit',
      amount_brl: amountUsd,
      status: 'completed',
      metadata: { method: 'card', stripe_session_id: sessionId },
    })

    await admin.from('notifications').insert({
      user_id: profile.id,
      type: 'deposit_confirmed',
      title: 'Deposit confirmed',
      body: `$${amountUsd.toFixed(2)} added to your balance via card payment.`,
      read: false,
    })

    if (profile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      sendDepositConfirmedEmail({ to: profile.email, name: profile.name || 'Trader', amount: amountUsd })
    }

    return NextResponse.json({ credited: amountUsd })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
