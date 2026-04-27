import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

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
    const privyUserId = claims.userId

    const admin = await createAdminClient()

    // Get or create profile
    let { data: profile } = await admin
      .from('profiles')
      .select('balance_brl, is_admin, name, email')
      .eq('privy_id', privyUserId)
      .single()

    if (!profile) {
      // First login — create profile
      const { data: newProfile } = await admin.from('profiles').insert({
        privy_id: privyUserId,
        email: claims.appId,
        name: 'User',
        balance_brl: 0,
        is_admin: false,
      }).select().single()
      profile = newProfile
    }

    return NextResponse.json({
      balance: profile?.balance_brl || 0,
      is_admin: profile?.is_admin || false,
      name: profile?.name || 'User',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
