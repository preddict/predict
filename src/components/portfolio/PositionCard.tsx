import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface Market {
  id: string
  title: string
  category: string
  yes_price: number
  no_price: number
  status: string
  outcome: string | null
}

interface Position {
  id: string
  market_id: string
  side: 'yes' | 'no'
  shares: number
  avg_price: number
  market: Market
}

interface Props {
  position: Position
}

export default function PositionCard({ position }: Props) {
  const { market, side, shares, avg_price } = position
  const currentPrice = side === 'yes' ? market.yes_price : market.no_price
  const invested = shares * avg_price
  const currentValue = shares * currentPrice
  const pnl = currentValue - invested
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0

  const isResolved = market.status === 'resolved'
  const won = isResolved && market.outcome === side
  const lost = isResolved && market.outcome !== side

  const yesProb = Math.round(market.yes_price * 100)
  const finalValue = isResolved ? (won ? shares : 0) : currentValue

  return (
    <div className={`rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors ${
      won ? 'border-green-300 bg-green-50/30' : lost ? 'border-red-200 bg-red-50/20' : 'border-border'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-snug line-clamp-2">{market.title}</p>
          <span className="text-xs text-muted-foreground capitalize">{market.category}</span>
        </div>
        <Link href={`/markets/${market.id}`} className="shrink-0 p-1 hover:bg-muted rounded-md text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          side === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}>
          {side.toUpperCase()}
        </span>
        {isResolved ? (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
          }`}>
            {won ? 'Won' : 'Lost'}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground capitalize">
            {market.status}
          </span>
        )}
      </div>

      {/* Probability bar */}
      {!isResolved && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>YES {yesProb}%</span>
            <span>NO {100 - yesProb}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${yesProb}%` }}
            />
          </div>
        </div>
      )}

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Shares</p>
          <p className="font-medium">{shares.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Invested</p>
          <p className="font-medium">${invested.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{isResolved ? 'Final' : 'Value'}</p>
          <p className={`font-semibold ${won ? 'text-green-600' : lost ? 'text-red-500' : pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            ${finalValue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* PnL row */}
      {!isResolved && (
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">P&L</span>
          <span className={`font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  )
}
