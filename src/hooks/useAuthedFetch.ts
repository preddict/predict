'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useCallback } from 'react'

function extractEmail(user: any): string | null {
  return (
    user?.email?.address ||
    user?.google?.email ||
    user?.linkedAccounts?.find((a: any) => a.type === 'google_oauth')?.email ||
    user?.linkedAccounts?.find((a: any) => a.type === 'email')?.address ||
    null
  )
}

export function useAuthedFetch() {
  const { getAccessToken, user } = usePrivy()

  const authedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getAccessToken()
    const email = extractEmail(user)

    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(email ? { 'x-user-email': email } : {}),
      },
    })
  }, [getAccessToken, user])

  return authedFetch
}
