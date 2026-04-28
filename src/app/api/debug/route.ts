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

    // Check all lookup methods
    const { data: byPrivyId } = await admin
      .from('profiles')
      .select('id, privy_id, privy_ids, name, email, balance_brl')
      .eq('privy_id', privyUserId)
      .single()

    let byArray = null
    try {
      const { data } = await admin
        .from('profiles')
        .select('id, privy_id, privy_ids, name, email, balance_brl')
        .contains('privy_ids', [privyUserId])
        .single()
      byArray = data
    } catch { /* ignore */ }

    let privyUser: any = null
    let privyError = null
    try { privyUser = await privy.getUser(privyUserId) } catch (e: any) {
      privyError = e?.message || 'unknown error'
    }

    const email = privyUser?.linkedAccounts?.find((a: any) => a.type === 'email')?.address
      || privyUser?.linkedAccounts?.find((a: any) => a.type === 'google_oauth')?.email
      || null

    let byEmail = null
    if (email) {
      const { data } = await admin
        .from('profiles')
        .select('id, privy_id, privy_ids, name, email, balance_brl')
        .eq('email', email)
        .single()
      byEmail = data
    }

    const profile = byPrivyId || byArray || byEmail

    return NextResponse.json({
      privy_id: privyUserId,
      profile_found: !!profile,
      profile_id: profile?.id || null,
      profile_balance: profile?.balance_brl ?? 0,
      profile_name: profile?.name || null,
      found_by: byPrivyId ? 'privy_id' : byArray ? 'privy_ids_array' : byEmail ? 'email' : 'none',
      email_from_privy: email,
      privy_api_error: privyError,
      privy_linked_accounts: privyUser?.linkedAccounts?.map((a: any) => ({
        type: a.type,
        address: a.address || a.email || null,
      })) || [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
