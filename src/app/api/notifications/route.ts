import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveProfile } from '@/lib/resolveProfile'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

async function getProfile(token: string) {
  const claims = await privy.verifyAuthToken(token)
  const admin = await createAdminClient()
  return resolveProfile(admin, claims.userId)
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getProfile(token)
    if (!profile) return NextResponse.json({ notifications: [] })

    const admin = await createAdminClient()
    const { data } = await admin
      .from('notifications')
      .select('id, type, title, body, market_id, read, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)

    return NextResponse.json({ notifications: data || [] })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getProfile(token)
    if (!profile) return NextResponse.json({ success: true })

    const admin = await createAdminClient()
    await admin.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
