import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { lmsrPrice } from '@/lib/lmsr'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, category, closes_at, liquidity_b } = body

  if (!title || !category || !closes_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const b = parseFloat(liquidity_b) || 200
  const q_yes = 0
  const q_no = 0
  const { yes: yes_price, no: no_price } = lmsrPrice(q_yes, q_no, b)

  const admin = await createAdminClient()
  const { data, error } = await admin.from('markets').insert({
    title,
    description: description || null,
    category,
    closes_at: new Date(closes_at).toISOString(),
    liquidity_b: b,
    q_yes,
    q_no,
    yes_price,
    no_price,
    status: 'open',
    volume_brl: 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ market: data })
}
