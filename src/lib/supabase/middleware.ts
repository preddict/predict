import { NextResponse, type NextRequest } from 'next/server'

// Auth is handled client-side by Privy — middleware just passes through
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request })
}
