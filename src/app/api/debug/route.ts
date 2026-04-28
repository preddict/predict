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
    const privyUserId = claims.userId

    const admin = await createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, privy_id, name, email, balance_brl')
      .eq('privy_id', privyUserId)
      .single()

    let privyUser: any = null
    try { privyUser = await privy.getUser(privyUserId) } catch {}

    return NextResponse.json({
      privy_id: privyUserId,
      profile_found: !!profile,
      profile_id: profile?.id || null,
      profile_balance: profile?.balance_brl || 0,
      profile_name: profile?.name || null,
      privy_linked_accounts: privyUser?.linkedAccounts?.map((a: any) => ({
        type: a.type,
        address: a.address || a.email || null,
      })) || [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
