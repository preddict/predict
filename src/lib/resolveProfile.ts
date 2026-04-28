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
  try {
    const { data: byArray } = await admin
      .from('profiles').select('*')
      .contains('privy_ids', [privyUserId])
      .single()
    if (byArray) {
      if (!byArray.privy_id) {
        await admin.from('profiles').update({ privy_id: privyUserId }).eq('id', byArray.id)
      }
      return byArray
    }
  } catch { /* privy_ids column may not exist yet */ }

  // 3. Fetch Privy user info to enable email lookup
  const privyUser = await getPrivyUserWithRetry(privyUserId)

  let email: string | null = null
  let walletAddress: string | null = null
  let name = 'User'

  if (privyUser) {
    email = extractEmail(privyUser)
    const embeddedWallet = privyUser.linkedAccounts?.find(
      (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
    ) as any
    walletAddress = embeddedWallet?.address || null
    const googleAccount = privyUser.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any
    name = googleAccount?.name || (email ? email.split('@')[0] : 'User')
  }

  // 4. Email fallback: same person, different login method or device
  if (email) {
    const { data: byEmail } = await admin
      .from('profiles').select('*').eq('email', email).single()

    if (byEmail) {
      // Link this new device's privy_id to the existing profile
      const updatedIds = Array.from(new Set([...(byEmail.privy_ids || []), privyUserId]))
      await admin.from('profiles')
        .update({
          privy_ids: updatedIds,
          privy_id: byEmail.privy_id || privyUserId,
          wallet_address: walletAddress || byEmail.wallet_address,
        })
        .eq('id', byEmail.id)
      return { ...byEmail, privy_ids: updatedIds }
    }
  }

  // 5. Genuinely new user — create profile
  try {
    const { data: newProfile } = await admin.from('profiles').insert({
      privy_id: privyUserId,
      privy_ids: [privyUserId],
      email,
      name,
      balance_brl: 0,
      is_admin: false,
      wallet_address: walletAddress,
    }).select().single()

    if (newProfile) return newProfile
  } catch {
    // privy_ids column may not exist — retry without it
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

  return null
}
