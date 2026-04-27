import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await createAdminClient()

  const { data } = await admin
    .from('comments')
    .select('id, content, created_at, user:profiles(id, name, email)')
    .eq('market_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ comments: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const claims = await privy.verifyAuthToken(token)
    const admin = await createAdminClient()

    const { data: profile } = await admin
      .from('profiles').select('id').eq('privy_id', claims.userId).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { content } = await req.json()
    const trimmed = (content || '').trim()
    if (!trimmed || trimmed.length < 1) return NextResponse.json({ error: 'Comment is empty' }, { status: 400 })
    if (trimmed.length > 500) return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })

    const { data, error } = await admin
      .from('comments')
      .insert({ market_id: id, user_id: profile.id, content: trimmed })
      .select('id, content, created_at, user:profiles(id, name, email)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ comment: data })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
