import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  const redirect = searchParams.get('redirect') || next
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Password reset redirect
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/reset-password`)
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
