import { NextResponse } from 'next/server'

// Called by Vercel Cron every hour
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const SYNC_SECRET = process.env.SYNC_SECRET || 'predict-sync-2026'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SYNC_SECRET}` },
  })

  const data = await res.json()
  return NextResponse.json(data)
}
