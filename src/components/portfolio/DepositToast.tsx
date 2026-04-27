'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { toast } from 'sonner'

export default function DepositToast({ status }: { status?: string }) {
  const searchParams = useSearchParams()
  const { getAccessToken } = usePrivy()
  const ran = useRef(false)

  useEffect(() => {
    if (!status || ran.current) return
    ran.current = true

    if (status === 'cancelled') {
      toast.info('Payment cancelled.')
      window.location.href = '/portfolio'
      return
    }

    if (status !== 'success') return

    const amount = searchParams.get('amount')
    const sessionId = searchParams.get('session_id')

    toast.success(amount ? `$${parseFloat(amount).toFixed(2)} added to your balance!` : 'Deposit successful!')

    async function verify() {
      if (!sessionId) return
      try {
        const token = await getAccessToken()
        await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId }),
        })
      } catch {
        // silent — webhook will handle it as fallback
      } finally {
        window.location.href = '/portfolio'
      }
    }

    verify()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
