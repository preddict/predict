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

async function findByEmail(admin: any, email: string) {
  // Case-insensitive email lookup
  const { data } = await admin
    .from('profiles').select('*')
    .ilike('email', email)
    .single()
  return data
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
    const byEmail = await findByEmail(admin, email)
    if (byEmail) {
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

  // 5. Create new profile — check INSERT errors explicitly
  const { data: newProfile, error: insertError } = await admin.from('profiles').insert({
    privy_id: privyUserId,
    privy_ids: [privyUserId],
    email,
    name,
    balance_brl: 0,
    is_admin: false,
    wallet_address: walletAddress,
  }).select().single()

  if (newProfile) return newProfile

  // INSERT failed (e.g. unique constraint) — profile already exists, find it
  if (insertError) {
    console.error('[resolveProfile] INSERT failed:', insertError.message, 'privy_id:', privyUserId, 'email:', email)

    // Try email again (INSERT may have failed due to duplicate email)
    if (email) {
      const byEmailRetry = await findByEmail(admin, email)
      if (byEmailRetry) {
        // Link this privy_id now
        const updatedIds = Array.from(new Set([...(byEmailRetry.privy_ids || []), privyUserId]))
        await admin.from('profiles')
          .update({ privy_ids: updatedIds, privy_id: byEmailRetry.privy_id || privyUserId })
          .eq('id', byEmailRetry.id)
        return { ...byEmailRetry, privy_ids: updatedIds }
      }
    }

    // Try privy_id again (race condition — maybe just inserted)
    const { data: byPrivyIdRetry } = await admin
      .from('profiles').select('*').eq('privy_id', privyUserId).single()
    if (byPrivyIdRetry) return byPrivyIdRetry

    // Last resort: try INSERT without privy_ids column
    const { data: fallback } = await admin.from('profiles').insert({
      privy_id: privyUserId,
      email,
      name,
      balance_brl: 0,
      is_admin: false,
      wallet_address: walletAddress,
    }).select().single()
    if (fallback) return fallback
  }

  console.error('[resolveProfile] All lookups exhausted for privy_id:', privyUserId)
  return null
}
