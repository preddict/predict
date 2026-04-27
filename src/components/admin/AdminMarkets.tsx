'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, RefreshCw, CheckCircle, XCircle, Search, ExternalLink } from 'lucide-react'

interface Market {
  id: string
  title: string
  category: string
  status: string
  outcome: string | null
  yes_price: number
  no_price: number
  volume_brl: number
  polymarket_volume: number
  closes_at: string
  polymarket_id: string | null
  created_at: string
}

interface Props {
  markets: Market[]
}

const categories = ['politics', 'sports', 'economy', 'crypto', 'entertainment', 'technology', 'world', 'weather']

export default function AdminMarkets({ markets }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  // Create market form state
  const [form, setForm] = useState({
    title: '', description: '', category: 'politics',
    closes_at: '', liquidity_b: '200',
  })

  const filtered = markets.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync?secret=predict-sync-2026')
      const data = await res.json()
      if (data.success) {
        toast.success(`Sync done! Imported: ${data.imported}, Updated: ${data.updated}, Resolved: ${data.resolved}`)
        router.refresh()
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Market created!')
    setShowCreateForm(false)
    setForm({ title: '', description: '', category: 'politics', closes_at: '', liquidity_b: '200' })
    router.refresh()
  }

  async function handleResolve(marketId: string, outcome: 'yes' | 'no') {
    if (!confirm(`Resolve this market as ${outcome.toUpperCase()}?`)) return
    setResolvingId(marketId)
    try {
      const res = await fetch('/api/admin/markets/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, outcome }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`Market resolved as ${outcome.toUpperCase()}!`)
      router.refresh()
    } catch {
      toast.error('Failed to resolve')
    } finally {
      setResolvingId(null)
    }
  }

  async function handleClose(marketId: string) {
    const res = await fetch('/api/admin/markets/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Market closed')
    router.refresh()
  }

  function formatVol(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
    return `$${v.toFixed(0)}`
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground"
        >
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="resolved">Resolved</option>
        </select>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Polymarket'}
        </button>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          New Market
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Create new market</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              placeholder="Market question (e.g. Will X happen by Y?)"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground"
            />
            <textarea
              placeholder="Description / resolution criteria..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground resize-none"
            />
            <div className="grid grid-cols-3 gap-3">
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="datetime-local"
                value={form.closes_at}
                onChange={e => setForm(f => ({ ...f, closes_at: e.target.value }))}
                required
                className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground"
              />
              <input
                type="number"
                placeholder="Liquidity (default 200)"
                value={form.liquidity_b}
                onChange={e => setForm(f => ({ ...f, liquidity_b: e.target.value }))}
                className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-foreground"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 text-sm font-semibold bg-foreground text-background rounded-lg hover:opacity-90">
                Create Market
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Markets table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">{filtered.length} markets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Market</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Prices</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 100).map(m => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-start gap-2">
                      <p className="text-xs font-medium line-clamp-2 leading-snug">{m.title}</p>
                      {m.polymarket_id && (
                        <span className="shrink-0 text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">PM</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground capitalize">{m.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-green-600 font-medium">{Math.round(m.yes_price * 100)}%</span>
                    <span className="text-xs text-muted-foreground"> / </span>
                    <span className="text-xs text-red-500 font-medium">{Math.round(m.no_price * 100)}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-medium">{formatVol(m.volume_brl)}</p>
                      {m.polymarket_volume > 0 && (
                        <p className="text-xs text-muted-foreground">PM: {formatVol(m.polymarket_volume)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === 'open' ? 'bg-green-100 text-green-700' :
                      m.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {m.outcome ? `${m.status} (${m.outcome.toUpperCase()})` : m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {m.status === 'open' && (
                        <>
                          <button
                            onClick={() => handleResolve(m.id, 'yes')}
                            disabled={resolvingId === m.id}
                            className="p-1.5 rounded-md hover:bg-green-100 text-green-600 transition-colors"
                            title="Resolve YES"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResolve(m.id, 'no')}
                            disabled={resolvingId === m.id}
                            className="p-1.5 rounded-md hover:bg-red-100 text-red-500 transition-colors"
                            title="Resolve NO"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleClose(m.id)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors text-xs"
                            title="Close betting"
                          >
                            Close
                          </button>
                        </>
                      )}
                      <a
                        href={`/markets/${m.id}`}
                        target="_blank"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
