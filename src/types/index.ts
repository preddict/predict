export type MarketStatus = 'open' | 'closed' | 'resolved'
export type MarketOutcome = 'yes' | 'no' | null
export type BetSide = 'yes' | 'no'
export type TransactionType = 'deposit' | 'withdraw' | 'buy' | 'sell' | 'payout'
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type MarketCategory =
  | 'politics'
  | 'sports'
  | 'economy'
  | 'crypto'
  | 'entertainment'
  | 'technology'
  | 'world'
  | 'weather'

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  balance_brl: number
  is_admin: boolean
  created_at: string
}

export interface Market {
  id: string
  title: string
  description: string
  category: MarketCategory
  image_url: string | null
  yes_price: number
  no_price: number
  q_yes: number
  q_no: number
  liquidity_b: number
  volume_brl: number
  status: MarketStatus
  outcome: MarketOutcome
  closes_at: string
  created_at: string
  created_by: string
  total_bettors?: number
}

export interface Position {
  id: string
  user_id: string
  market_id: string
  side: BetSide
  shares: number
  avg_price: number
  created_at: string
  market?: Market
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount_brl: number
  market_id: string | null
  status: TransactionStatus
  created_at: string
  market?: Market
}

export interface Order {
  id: string
  user_id: string
  market_id: string
  side: BetSide
  shares: number
  price: number
  total_brl: number
  fee_brl: number
  created_at: string
}

export interface PriceHistory {
  id: string
  market_id: string
  yes_price: number
  volume: number
  timestamp: string
}
