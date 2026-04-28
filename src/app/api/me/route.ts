import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveProfile } from '@/lib/resolveProfile'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const token = authHeader.replace('Bearer ', '')
    const claims = await privy.verifyAuthToken(token)
    const admin = await createAdminClient()

    const profile = await resolveProfile(admin, claims.userId)
    if (!profile) return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })

    return NextResponse.json({
      balance: profile.balance_brl || 0,
      is_admin: profile.is_admin || false,
      name: profile.name || 'User',
      wallet_address: profile.wallet_address || null,
      avatar_url: profile.avatar_url || null,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const token = authHeader.replace('Bearer ', '')
    const claims = await privy.verifyAuthToken(token)
    const { name } = await req.json()

    const trimmed = (name || '').trim()
    if (!trimmed || trimmed.length < 2 || trimmed.length > 40) {
      return NextResponse.json({ error: 'Name must be 2–40 characters' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const profile = await resolveProfile(admin, claims.userId)
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { error } = await admin
      .from('profiles').update({ name: trimmed }).eq('id', profile.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ name: trimmed })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
