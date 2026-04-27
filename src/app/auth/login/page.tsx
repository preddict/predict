'use client'

import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'

export default function LoginPage() {
  const { ready, authenticated, login } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) router.push('/')
    else if (ready && !authenticated) login()
  }, [ready, authenticated, login, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-background stroke-[2.5]" />
        </div>
        <div className="h-5 w-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}
