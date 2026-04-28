import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .limit(1)

    return NextResponse.json({
      supabase: error ? `ERROR: ${error.message}` : 'OK',
      profiles_accessible: !error,
      supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      privy_id_set: !!process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      privy_secret_set: !!process.env.PRIVY_APP_SECRET,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
