'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function DepositToast({ status }: { status?: string }) {
  const router = useRouter()

  useEffect(() => {
    if (status === 'success') {
      toast.success('Deposit successful! Your balance has been updated.')
      router.replace('/portfolio')
    } else if (status === 'cancelled') {
      toast.info('Deposit cancelled.')
      router.replace('/portfolio')
    }
  }, [status, router])

  return null
}
