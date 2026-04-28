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
      if (i < 2) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  return null
}

async function findByEmail(admin: any, email: string) {
  const { data } = await admin
    .from('profiles').select('*')
    .ilike('email', email)
    .single()
  return data
}

async function linkPrivyIdToProfile(admin: any, profile: any, privyUserId: string, walletAddress?: string | null) {
  const updatedIds = Array.from(new Set([...(profile.privy_ids || []), privyUserId]))
  await admin.from('profiles')
    .update({
      privy_id: privyUserId,
      privy_ids: updatedIds,
      ...(walletAddress ? { wallet_address: walletAddress } : {}),
    })
    .eq('id', profile.id)
  return { ...profile, privy_id: privyUserId, privy_ids: updatedIds }
}

async function createProfile(admin: any, privyUserId: string, email: string | null, name: string, walletAddress: string | null) {
  // Try with privy_ids column
  const { data: p1, error: e1 } = await admin.from('profiles').insert({
    privy_id: privyUserId,
    privy_ids: [privyUserId],
    email,
    name,
    balance_brl: 0,
    is_admin: false,
    wallet_address: walletAddress,
  }).select().single()

  if (p1) return p1

  // Maybe privy_ids column doesn't exist — try without it
  if (e1) {
    console.error('[resolveProfile] INSERT error:', e1.message, '| privy_id:', privyUserId, '| email:', email)

    // Check if the profile was already created by a concurrent request
    const { data: existing } = await admin
      .from('profiles').select('*').eq('privy_id', privyUserId).single()
    if (existing) return existing

    // Try minimal insert
    const { data: p2 } = await admin.from('profiles').insert({
      privy_id: privyUserId,
      email,
      name,
      balance_brl: 0,
      is_admin: false,
      wallet_address: walletAddress,
    }).select().single()
    if (p2) return p2
  }

  return null
}

// emailHint: passed directly from client via x-user-email header — avoids server-side Privy API call
export async function resolveProfile(admin: any, privyUserId: string, emailHint?: string | null) {
  // 1. Fast path: exact privy_id match
  const { data: byPrivyId } = await admin
    .from('profiles').select('*').eq('privy_id', privyUserId).single()
  if (byPrivyId) return byPrivyId

  // 2. Secondary: privy_ids array
  try {
    const { data: byArray } = await admin
      .from('profiles').select('*')
      .contains('privy_ids', [privyUserId])
      .single()
    if (byArray) return byArray
  } catch { /* privy_ids column may not exist */ }

  // 3. Email lookup — use client-provided hint first (fast, no API call needed)
  const emailToTry = emailHint?.toLowerCase().trim() || null
  if (emailToTry && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToTry)) {
    const byEmail = await findByEmail(admin, emailToTry)
    if (byEmail) {
      return await linkPrivyIdToProfile(admin, byEmail, privyUserId)
    }
  }

  // 4. Fallback: try Privy API to get email (may fail — that's OK)
  let email = emailToTry
  let walletAddress: string | null = null
  let name = emailToTry ? emailToTry.split('@')[0] : 'User'

  const privyUser = await getPrivyUserWithRetry(privyUserId)
  if (privyUser) {
    const privyEmail = extractEmail(privyUser)
    if (privyEmail) email = privyEmail

    const embedded = privyUser.linkedAccounts?.find(
      (a: any) => a.type === 'wallet' && a.walletClientType === 'privy'
    ) as any
    walletAddress = embedded?.address || null

    const google = privyUser.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any
    name = google?.name || (email ? email.split('@')[0] : 'User')

    // Try email from Privy API if different from hint
    if (email && email !== emailToTry) {
      const byPrivyEmail = await findByEmail(admin, email)
      if (byPrivyEmail) {
        return await linkPrivyIdToProfile(admin, byPrivyEmail, privyUserId, walletAddress)
      }
    }
  }

  // 5. Create new profile
  return await createProfile(admin, privyUserId, email, name, walletAddress)
}
