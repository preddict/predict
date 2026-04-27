import { TrendingUp, BarChart2, Users, DollarSign } from 'lucide-react'

interface Props {
  totalVolume: number
  openMarkets: number
  totalUsers: number
  totalDeposited: number
}

export default function AdminStats({ totalVolume, openMarkets, totalUsers, totalDeposited }: Props) {
  const stats = [
    { label: 'Total Volume', value: `$${(totalVolume / 1000).toFixed(1)}k`, icon: TrendingUp },
    { label: 'Open Markets', value: openMarkets, icon: BarChart2 },
    { label: 'Total Users', value: totalUsers, icon: Users },
    { label: 'Total Deposited', value: `$${totalDeposited.toFixed(2)}`, icon: DollarSign },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
        </div>
      ))}
    </div>
  )
}
