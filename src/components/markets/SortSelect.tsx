'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const options = [
  { value: 'volume', label: 'Top Volume' },
  { value: 'newest', label: 'Newest' },
  { value: 'closing', label: 'Closing Soon' },
]

export default function SortSelect({ current }: { current: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'volume') params.set('sort', value)
    else params.delete('sort')
    router.push(`/?${params.toString()}`)
  }

  return (
    <select
      value={current}
      onChange={e => onChange(e.target.value)}
      className="text-xs bg-transparent border border-border rounded-lg px-2 py-1 text-muted-foreground focus:outline-none focus:border-foreground transition-colors cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
