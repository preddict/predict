import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await req.json()
  const amountNum = Number(amount)

  if (!amountNum || amountNum < 5 || amountNum > 10000) {
    return NextResponse.json({ error: 'Amount must be between $5 and $10,000' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', user.id).single()

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: profile?.email || user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amountNum * 100),
          product_data: {
            name: 'PREDICT — Add Funds',
            description: `Deposit $${amountNum.toFixed(2)} to your PREDICT balance`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
      amount_usd: amountNum.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/portfolio?deposit=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/portfolio?deposit=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
