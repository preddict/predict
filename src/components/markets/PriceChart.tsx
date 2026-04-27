'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { PriceHistory } from '@/types'

interface Props {
  data: PriceHistory[]
  currentYesPrice: number
}

type Range = '1h' | '6h' | '24h' | '7d' | 'all'

function filterByRange(data: PriceHistory[], range: Range): PriceHistory[] {
  if (range === 'all' || data.length === 0) return data
  const now = Date.now()
  const ms: Record<Range, number> = {
    '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000, all: Infinity,
  }
  return data.filter(d => now - new Date(d.timestamp).getTime() <= ms[range])
}

function formatTime(ts: string, range: Range) {
  const d = new Date(ts)
  if (range === '1h' || range === '6h' || range === '24h')
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const yes = payload[0]?.value ?? 0
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-green-600">YES: {yes}%</p>
      <p className="font-semibold text-red-500">NO: {100 - yes}%</p>
    </div>
  )
}

export default function PriceChart({ data, currentYesPrice }: Props) {
  const [range, setRange] = useState<Range>('all')
  const ranges: Range[] = ['1h', '6h', '24h', '7d', 'all']
  const filtered = filterByRange(data, range)

  const chartData = filtered.length > 0
    ? filtered.map(d => ({ time: formatTime(d.timestamp, range), yes: Math.round(d.yes_price * 100) }))
    : [{ time: 'Now', yes: Math.round(currentYesPrice * 100) }]

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        {ranges.map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-md transition-colors font-medium border ${
              range === r
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
            }`}>
            {r === 'all' ? 'All' : r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#777777' }} tickLine={false} axisLine={{ stroke: '#E5E0D8' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#777777' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
          <ReferenceLine y={50} stroke="#E5E0D8" strokeDasharray="4 4" />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="yes" stroke="#16a34a" strokeWidth={2} fill="url(#yesGrad)"
            dot={false} activeDot={{ r: 4, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
