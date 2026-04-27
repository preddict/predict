'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export default function DepositToast({ status }: { status?: string }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (status === 'success') {
      const amount = searchParams.get('amount')
      const msg = amount
        ? `$${parseFloat(amount).toFixed(2)} added to your balance!`
        : 'Deposit successful! Your balance has been updated.'
      toast.success(msg)
      // Wait 3s for webhook to process, then hard reload to get fresh balance
      setTimeout(() => {
        window.location.href = '/portfolio'
      }, 3000)
    } else if (status === 'cancelled') {
      toast.info('Payment cancelled.')
      window.location.href = '/portfolio'
    }
  }, [status, searchParams])

  return null
}
