'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

const categories = [
  { value: '', label: 'All' },
  { value: 'politics', label: '🏛️ Politics' },
  { value: 'sports', label: '🏆 Sports' },
  { value: 'economy', label: '📈 Economy' },
  { value: 'crypto', label: '₿ Crypto' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'technology', label: '💻 Technology' },
  { value: 'world', label: '🌍 World' },
]

const sortOptions = [
  { value: 'volume', label: 'Top Volume' },
  { value: 'newest', label: 'Newest' },
  { value: 'closing', label: 'Closing Soon' },
]

export default function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/?${params.toString()}`)
  }, [router, searchParams])

  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'volume'

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    update('q', query)
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Search + Sort */}
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search markets..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors"
          />
        </form>
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={sort}
            onChange={e => update('sort', e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => {
          const isActive = category === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => update('category', cat.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
