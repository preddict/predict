'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export default function DepositToast({ status }: { status?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (status === 'success') {
      const amount = searchParams.get('amount')
      const msg = amount
        ? `$${parseFloat(amount).toFixed(2)} added to your balance!`
        : 'Deposit successful! Your balance has been updated.'
      toast.success(msg)
      // Small delay to let webhook process before page reload
      setTimeout(() => router.replace('/portfolio'), 1500)
    } else if (status === 'cancelled') {
      toast.info('Payment cancelled.')
      router.replace('/portfolio')
    }
  }, [status, router, searchParams])

  return null
}
