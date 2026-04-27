import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { marketId, outcome } = await req.json()
  if (!marketId || !outcome) return NextResponse.json({ error: 'Missing marketId or outcome' }, { status: 400 })
  if (!['yes', 'no'].includes(outcome)) return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })

  const admin = await createAdminClient()
  const { error } = await admin.rpc('resolve_market', { p_market_id: marketId, p_outcome: outcome })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
