import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// Called on app load with the email the Privy client already knows about.
// Links the current privy_id to the existing profile with that email.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await privy.verifyAuthToken(token)
    const privyUserId = claims.userId
    const admin = await createAdminClient()

    // Already linked — nothing to do
    const { data: existing } = await admin
      .from('profiles').select('id').eq('privy_id', privyUserId).single()
    if (existing) return NextResponse.json({ linked: false })

    // Also check privy_ids array
    try {
      const { data: inArray } = await admin
        .from('profiles').select('id')
        .contains('privy_ids', [privyUserId]).single()
      if (inArray) return NextResponse.json({ linked: false })
    } catch { /* column may not exist */ }

    // Get email hint from client
    const body = await req.json().catch(() => ({}))
    const emailHint = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : null

    if (!emailHint || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailHint)) {
      return NextResponse.json({ error: 'No valid email provided' }, { status: 400 })
    }

    const { data: byEmail } = await admin
      .from('profiles').select('*').ilike('email', emailHint).single()

    if (!byEmail) {
      return NextResponse.json({ linked: false, message: 'No profile found for this email' })
    }

    const updatedIds = Array.from(new Set([...(byEmail.privy_ids || []), privyUserId]))
    await admin.from('profiles')
      .update({ privy_ids: updatedIds, privy_id: privyUserId })
      .eq('id', byEmail.id)

    return NextResponse.json({ linked: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid token' }, { status: 401 })
  }
}
