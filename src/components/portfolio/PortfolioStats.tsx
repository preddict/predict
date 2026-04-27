import { Wallet, TrendingUp, BarChart2, Trophy } from 'lucide-react'

interface Props {
  balance: number
  invested: number
  currentValue: number
  resolvedPnl: number
}

export default function PortfolioStats({ balance, invested, currentValue, resolvedPnl }: Props) {
  const unrealizedPnl = currentValue - invested
  const totalPnl = unrealizedPnl + resolvedPnl

  const stats = [
    {
      label: 'Balance',
      value: `$${balance.toFixed(2)}`,
      icon: Wallet,
      sub: 'Available to bet',
    },
    {
      label: 'Open Positions',
      value: `$${currentValue.toFixed(2)}`,
      icon: BarChart2,
      sub: invested > 0
        ? `${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)} unrealized`
        : 'No open positions',
      subColor: unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-500',
    },
    {
      label: 'Total P&L',
      value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`,
      icon: TrendingUp,
      sub: 'All time',
      valueColor: totalPnl >= 0 ? 'text-green-600' : 'text-red-500',
    },
    {
      label: 'Resolved Gains',
      value: `${resolvedPnl >= 0 ? '+' : ''}$${resolvedPnl.toFixed(2)}`,
      icon: Trophy,
      sub: 'Realized profit',
      valueColor: resolvedPnl >= 0 ? 'text-green-600' : 'text-red-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, sub, subColor, valueColor }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={`text-2xl font-bold ${valueColor || 'text-foreground'}`}>{value}</div>
          {sub && <p className={`text-xs mt-1 ${subColor || 'text-muted-foreground'}`}>{sub}</p>}
        </div>
      ))}
    </div>
  )
}
