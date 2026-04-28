import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

function extractEmail(privyUser: any): string | null {
  const emailAccount = privyUser.linkedAccounts?.find((a: any) => a.type === 'email')
  const googleAccount = privyUser.linkedAccounts?.find((a: any) => a.type === 'google_oauth')
  const raw = emailAccount?.address || googleAccount?.email || null
  return raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : null
}

async function resolveProfile(admin: any, privyUserId: string) {
  // 1. Fast path: look up by privy_id
  const { data: byPrivyId } = await admin
    .from('profiles')
    .select('*')
    .eq('privy_id', privyUserId)
    .single()
  if (byPrivyId) return byPrivyId

  // 2. Fetch Privy user to get the real email
  let privyUser: any = null
  try { privyUser = await privy.getUser(privyUserId) } catch { return null }

  const email = extractEmail(privyUser)
  const embeddedWallet = privyUser.linkedAccounts?.find(
    (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
  ) as any
  const walletAddress = embeddedWallet?.address || null
  const googleAccount = privyUser.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any
  const name = googleAccount?.name || (email ? email.split('@')[0] : 'User')

  // 3. Look up by email — covers users who logged in with a different method / device
  if (email) {
    const { data: byEmail } = await admin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (byEmail) {
      // Link this privy_id to the existing profile so future lookups are instant
      if (!byEmail.privy_id) {
        await admin.from('profiles')
          .update({ privy_id: privyUserId, wallet_address: walletAddress || byEmail.wallet_address })
          .eq('id', byEmail.id)
      }
      return byEmail
    }
  }

  // 4. Create fresh profile
  const { data: newProfile } = await admin.from('profiles').insert({
    privy_id: privyUserId,
    email,
    name,
    balance_brl: 0,
    is_admin: false,
    wallet_address: walletAddress,
  }).select().single()

  return newProfile
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const token = authHeader.replace('Bearer ', '')
    const claims = await privy.verifyAuthToken(token)
    const admin = await createAdminClient()

    const profile = await resolveProfile(admin, claims.userId)
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

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
      .from('profiles')
      .update({ name: trimmed })
      .eq('id', profile.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ name: trimmed })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
