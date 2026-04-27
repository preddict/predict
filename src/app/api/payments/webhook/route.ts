import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { sendDepositConfirmedEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] Missing stripe-signature or STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[webhook] Invalid signature:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[webhook] Received event:', event.type)

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  console.log('[webhook] Session payment_status:', session.payment_status, 'metadata:', session.metadata)

  if (session.payment_status !== 'paid') return NextResponse.json({ received: true })

  const userId = session.metadata?.user_id
  const amountUsd = parseFloat(session.metadata?.amount_usd || '0')

  if (!userId || amountUsd < 0.01) {
    console.error('[webhook] Invalid metadata — userId:', userId, 'amount:', amountUsd)
    return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, name, email, balance_brl')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('[webhook] User not found, userId:', userId, profileError)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error: rpcError } = await admin.rpc('add_balance', { p_user_id: userId, p_amount: amountUsd })
  if (rpcError) {
    console.error('[webhook] add_balance failed:', rpcError)
    return NextResponse.json({ error: 'Balance update failed' }, { status: 500 })
  }

  console.log('[webhook] Balance credited $', amountUsd, 'to user', userId)

  await admin.from('notifications').insert({
    user_id: userId,
    type: 'deposit_confirmed',
    title: 'Deposit confirmed',
    body: `$${amountUsd.toFixed(2)} added to your balance via card payment.`,
    read: false,
  })

  await admin.from('transactions').insert({
    user_id: userId,
    type: 'deposit',
    amount_brl: amountUsd,
    status: 'completed',
    metadata: { method: 'card', stripe_session_id: session.id },
  })

  if (profile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    sendDepositConfirmedEmail({
      to: profile.email,
      name: profile.name || 'Trader',
      amount: amountUsd,
    })
  }

  return NextResponse.json({ received: true })
}
