import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { sendDepositConfirmedEmail } from '@/lib/email'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// Native USDC on Polygon (6 decimals)
const USDC_CONTRACT = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
const POLYGON_RPC = 'https://polygon-rpc.com'

async function getUsdcBalance(address: string): Promise<number> {
  // balanceOf(address) = 0x70a08231 + address padded to 32 bytes
  const data = '0x70a08231' + address.replace('0x', '').padStart(64, '0')

  const res = await fetch(POLYGON_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: USDC_CONTRACT, data }, 'latest'],
      id: 1,
    }),
  })

  const json = await res.json()
  if (!json.result || json.result === '0x') return 0

  const raw = BigInt(json.result)
  return Number(raw) / 1_000_000 // USDC has 6 decimals
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await privy.verifyAuthToken(token)
    const admin = await createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('id, name, email, balance_brl, wallet_address, usdc_snapshot')
      .eq('privy_id', claims.userId)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (!profile.wallet_address) return NextResponse.json({ error: 'No wallet found' }, { status: 400 })

    const onChainBalance = await getUsdcBalance(profile.wallet_address)
    const snapshot = profile.usdc_snapshot ?? 0
    const credited = onChainBalance - snapshot

    if (credited < 0.01) {
      return NextResponse.json({ credited: 0, message: 'No new USDC detected' })
    }

    // Credit balance and update snapshot
    await admin.rpc('add_balance', { p_user_id: profile.id, p_amount: credited })
    await admin.from('profiles').update({ usdc_snapshot: onChainBalance }).eq('id', profile.id)
    // Email confirmation — fire and forget
    if (profile.email) {
      sendDepositConfirmedEmail({ to: profile.email, name: profile.name || 'Trader', amount: credited })
    }

    await admin.from('transactions').insert({
      user_id: profile.id,
      type: 'deposit',
      amount_brl: credited,
      status: 'completed',
      metadata: { method: 'usdc', wallet: profile.wallet_address, on_chain_balance: onChainBalance },
    })

    return NextResponse.json({ credited, newBalance: profile.balance_brl + credited })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid token' }, { status: 401 })
  }
}
