'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'

export default function DiagPage() {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (!ready || !authenticated) return
    getAccessToken().then(async token => {
      const res = await fetch('/api/debug', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResult(await res.json())
    })
  }, [ready, authenticated, getAccessToken])

  if (!ready) return <p style={{ padding: 24, fontFamily: 'monospace' }}>Carregando...</p>
  if (!authenticated) return <p style={{ padding: 24, fontFamily: 'monospace' }}>Faça login primeiro.</p>
  if (!result) return <p style={{ padding: 24, fontFamily: 'monospace' }}>Consultando...</p>

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8, wordBreak: 'break-all' }}>
      <strong>privy_id deste dispositivo:</strong><br />
      {result.privy_id}<br /><br />
      <strong>Perfil encontrado no banco:</strong> {result.profile_found ? '✅ SIM' : '❌ NÃO'}<br />
      <strong>Nome:</strong> {result.profile_name || '—'}<br />
      <strong>Saldo:</strong> {result.profile_balance ?? '—'}<br /><br />
      <strong>Contas vinculadas no Privy:</strong><br />
      {(result.privy_linked_accounts || []).map((a: any, i: number) => (
        <div key={i}>{a.type}: {a.address || '—'}</div>
      ))}
    </div>
  )
}
