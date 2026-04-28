import { PrivyClient } from '@privy-io/server-auth'

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

async function getPrivyUserWithRetry(privyUserId: string): Promise<any | null> {
  for (let i = 0; i < 3; i++) {
    try { return await privy.getUser(privyUserId) } catch {
      if (i < 2) await new Promise(r => setTimeout(r, 600 * (i + 1)))
    }
  }
  return null
}

export async function resolveProfile(admin: any, privyUserId: string) {
  // 1. Fast path: exact privy_id match
  const { data: byPrivyId } = await admin
    .from('profiles').select('*').eq('privy_id', privyUserId).single()
  if (byPrivyId) return byPrivyId

  // 2. Secondary: privy_ids array (other linked devices)
  const { data: byArray } = await admin
    .from('profiles').select('*')
    .contains('privy_ids', [privyUserId])
    .single()
  if (byArray) {
    // Ensure privy_id column also points to a known id for fast future lookups
    if (!byArray.privy_id) {
      await admin.from('profiles').update({ privy_id: privyUserId }).eq('id', byArray.id)
    }
    return byArray
  }

  // 3. Must verify identity before creating / linking
  const privyUser = await getPrivyUserWithRetry(privyUserId)
  if (!privyUser) return null

  const email = extractEmail(privyUser)
  const embeddedWallet = privyUser.linkedAccounts?.find(
    (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
  ) as any
  const walletAddress = embeddedWallet?.address || null
  const googleAccount = privyUser.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any
  const name = googleAccount?.name || (email ? email.split('@')[0] : 'User')

  // 4. Email fallback: same person, different login method or device
  if (email) {
    const { data: byEmail } = await admin
      .from('profiles').select('*').eq('email', email).single()

    if (byEmail) {
      const updatedIds = Array.from(new Set([...(byEmail.privy_ids || []), privyUserId]))
      await admin.from('profiles')
        .update({ privy_ids: updatedIds, wallet_address: walletAddress || byEmail.wallet_address })
        .eq('id', byEmail.id)
      return byEmail
    }
  }

  // 5. Genuinely new user
  const { data: newProfile } = await admin.from('profiles').insert({
    privy_id: privyUserId,
    privy_ids: [privyUserId],
    email,
    name,
    balance_brl: 0,
    is_admin: false,
    wallet_address: walletAddress,
  }).select().single()

  return newProfile
}
