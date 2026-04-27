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

    let { data: profile } = await admin
      .from('profiles')
      .select('id, balance_brl, is_admin, name, email, wallet_address, avatar_url')
      .eq('privy_id', privyUserId)
      .single()

    // Fetch Privy user separately so failures don't break the balance response
    try {
      const privyUser = await privy.getUser(privyUserId)
      const embeddedWallet = privyUser.linkedAccounts?.find(
        (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
      ) as any
      const walletAddress = embeddedWallet?.address || null

      if (!profile) {
        const emailAccount = privyUser.linkedAccounts?.find((a: any) => a.type === 'email') as any
        const googleAccount = privyUser.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any
        const email = emailAccount?.address || googleAccount?.email || null
        const name = googleAccount?.name || email?.split('@')[0] || 'User'

        const { data: newProfile } = await admin.from('profiles').insert({
          privy_id: privyUserId,
          email,
          name,
          balance_brl: 0,
          is_admin: false,
          wallet_address: walletAddress,
        }).select().single()
        profile = newProfile
      } else if (walletAddress && !profile.wallet_address) {
        await admin.from('profiles').update({ wallet_address: walletAddress }).eq('privy_id', privyUserId)
        profile.wallet_address = walletAddress
      }
    } catch {
      // Privy getUser failed — return whatever we have from the DB
    }

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    return NextResponse.json({
      balance: profile?.balance_brl || 0,
      is_admin: profile?.is_admin || false,
      name: profile?.name || 'User',
      wallet_address: profile?.wallet_address || null,
      avatar_url: (profile as any)?.avatar_url || null,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
