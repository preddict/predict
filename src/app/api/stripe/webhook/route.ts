import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status !== 'paid') return NextResponse.json({ received: true })

    const userId = session.metadata?.user_id
    const amountUsd = parseFloat(session.metadata?.amount_usd || '0')

    if (!userId || !amountUsd) return NextResponse.json({ received: true })

    const admin = await createAdminClient()

    // Credit balance
    await admin.rpc('add_balance', { p_user_id: userId, p_amount: amountUsd })

    // Record transaction
    await admin.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount_brl: amountUsd,
      status: 'completed',
      external_id: session.id,
      metadata: { stripe_session_id: session.id, payment_intent: session.payment_intent },
    })
  }

  return NextResponse.json({ received: true })
}
