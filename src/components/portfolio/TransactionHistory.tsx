'use client'

import { useState } from 'react'

interface Transaction {
  id: string
  type: string
  amount_brl: number
  status: string
  created_at: string
  market?: { title: string } | null
}

interface Props {
  transactions: Transaction[]
}

const typeLabel: Record<string, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdrawal',
  buy: 'Bet placed',
  sell: 'Position sold',
  payout: 'Winnings paid',
}

const typeColor: Record<string, string> = {
  deposit: 'text-green-600',
  payout: 'text-green-600',
  withdraw: 'text-red-500',
  buy: 'text-red-500',
  sell: 'text-green-600',
}

const typeSign: Record<string, string> = {
  deposit: '+',
  payout: '+',
  withdraw: '-',
  buy: '-',
  sell: '+',
}

export default function TransactionHistory({ transactions }: Props) {
  const [show, setShow] = useState(20)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No transactions yet.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {transactions.slice(0, show).map(tx => (
        <div key={tx.id} className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted/40 transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{typeLabel[tx.type] || tx.type}</p>
            {tx.market && (
              <p className="text-xs text-muted-foreground line-clamp-1">{tx.market.title}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${typeColor[tx.type] || 'text-foreground'}`}>
              {typeSign[tx.type]}R${tx.amount_brl.toFixed(2)}
            </p>
            <p className={`text-xs ${tx.status === 'completed' ? 'text-muted-foreground' : 'text-amber-600'}`}>
              {tx.status}
            </p>
          </div>
        </div>
      ))}

      {transactions.length > show && (
        <button
          onClick={() => setShow(s => s + 20)}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Show more ({transactions.length - show} remaining)
        </button>
      )}
    </div>
  )
}
