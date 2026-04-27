import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

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
    const admin = await createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, name')
      .eq('privy_id', claims.userId)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { amount } = await req.json()
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum < 5) {
      return NextResponse.json({ error: 'Minimum deposit is $5.00' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || '') ? profile.email : undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amountNum * 100),
            product_data: {
              name: 'PREDICT — Balance Deposit',
              description: `$${amountNum.toFixed(2)} added to your prediction market balance`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: profile.id,
        amount_usd: amountNum.toString(),
      },
      success_url: `${appUrl}/portfolio?deposit=success&amount=${amountNum}`,
      cancel_url: `${appUrl}/portfolio?deposit=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create session' }, { status: 500 })
  }
}
