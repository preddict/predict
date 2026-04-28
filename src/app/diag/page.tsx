'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'

export default function DiagPage() {
  const { ready, authenticated, getAccessToken, user } = usePrivy()
  const [result, setResult] = useState<string>('aguardando...')

  useEffect(() => {
    if (!ready) { setResult('Privy não está pronto ainda'); return }
    if (!authenticated) { setResult('Não está logado'); return }

    const email =
      (user as any)?.email?.address ||
      (user as any)?.google?.email ||
      (user as any)?.linkedAccounts?.find((a: any) => a.type === 'google_oauth')?.email ||
      (user as any)?.linkedAccounts?.find((a: any) => a.type === 'email')?.address ||
      'sem email'

    setResult(`Logado. Email Privy client: ${email}\nBuscando info do servidor...`)

    getAccessToken().then(async token => {
      try {
        const res = await fetch('/api/debug', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setResult(JSON.stringify({ email_client: email, ...data }, null, 2))
      } catch (e: any) {
        setResult(`Erro ao chamar /api/debug: ${e.message}`)
      }
    })
  }, [ready, authenticated, getAccessToken, user])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#fff', color: '#000',
      padding: 20, fontFamily: 'monospace', fontSize: 12,
      overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', zIndex: 9999,
    }}>
      {result}
    </div>
  )
}
