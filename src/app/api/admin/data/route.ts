import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await privy.verifyAuthToken(token)
    const admin = await createAdminClient()

    const { data: profile } = await admin
      .from('profiles').select('is_admin').eq('privy_id', claims.userId).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [{ data: markets }, { data: profiles }, { data: transactions }] = await Promise.all([
      admin.from('markets').select('*').order('created_at', { ascending: false }),
      admin.from('profiles').select('id, name, email, balance_brl, created_at').order('created_at', { ascending: false }),
      admin.from('transactions').select('*').order('created_at', { ascending: false }).limit(100),
    ])

    const totalVolume = markets?.reduce((s, m) => s + (m.volume_brl || 0), 0) || 0
    const openMarkets = markets?.filter(m => m.status === 'open').length || 0
    const totalUsers = profiles?.length || 0
    const totalDeposited = transactions
      ?.filter((t: any) => t.type === 'deposit' && t.status === 'completed')
      .reduce((s: number, t: any) => s + t.amount_brl, 0) || 0

    return NextResponse.json({ markets, profiles, transactions, totalVolume, openMarkets, totalUsers, totalDeposited })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
