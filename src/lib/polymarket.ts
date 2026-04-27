export interface PolymarketMarket {
  id: string
  question: string
  description: string
  endDate: string
  liquidity: string
  liquidityNum: number
  volume: string
  volumeNum: number
  active: boolean
  closed: boolean
  outcomes: string
  outcomePrices: string
  image: string
  icon: string
  restricted: boolean
  events: Array<{ title: string; slug: string }>
}

// Maps Polymarket question/event text to our categories
const categoryKeywords: Record<string, string[]> = {
  crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol', 'doge', 'xrp', 'coin', 'token', 'defi', 'blockchain', 'nft', 'binance', 'coinbase'],
  politics: ['trump', 'biden', 'president', 'congress', 'senate', 'election', 'democrat', 'republican', 'white house', 'government', 'minister', 'parliament', 'impeach', 'executive order', 'veto', 'legislation', 'tariff', 'musk', 'doge department', 'harris'],
  sports: ['nba', 'nfl', 'nhl', 'mlb', 'world cup', 'championship', 'playoffs', 'super bowl', 'world series', 'finals', 'tennis', 'golf', 'formula 1', 'f1', 'soccer', 'football', 'basketball', 'baseball', 'wimbledon', 'ufc', 'mma', 'olympic'],
  economy: ['fed ', 'federal reserve', 'interest rate', 'gdp', 'recession', 'inflation', 'cpi', 'unemployment', 'treasury', 'dollar', 'trade deal', 'trade war', 'stock market', 'nasdaq', 's&p', 'dow', 'bond'],
  technology: ['apple', 'google', 'meta ', 'microsoft', 'openai', 'gpt-', 'artificial intelligence', 'tesla', 'nvidia', 'amazon', 'spacex', 'starlink', 'chatgpt', 'gemini', 'claude', 'llm', 'iphone', 'android'],
  entertainment: ['oscar', 'grammy', 'emmy', 'award', 'box office', 'movie', 'film', 'celebrity', 'netflix', 'disney', 'taylor swift', 'superbowl halftime'],
  world: ['russia', 'ukraine', 'china', 'iran', 'israel', 'ceasefire', 'nato', 'united nations', 'war ', 'sanctions', 'treaty', 'middle east', 'gaza', 'taiwan', 'north korea', 'india', 'pakistan'],
}

export function detectCategory(question: string, eventTitle = ''): string {
  const text = `${question} ${eventTitle}`.toLowerCase()
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => text.includes(kw))) return category
  }
  return 'world'
}

export async function fetchPolymarketMarkets(limit = 100): Promise<PolymarketMarket[]> {
  const url = `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=${limit}&order=volumeNum&ascending=false`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PREDICT/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`)
  return res.json()
}

export async function fetchResolvedMarkets(limit = 50): Promise<PolymarketMarket[]> {
  const url = `https://gamma-api.polymarket.com/markets?closed=true&limit=${limit}&order=volumeNum&ascending=false`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PREDICT/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`)
  return res.json()
}

export function parseOutcome(outcomePrices: string): { yes: number; no: number } {
  try {
    const prices = JSON.parse(outcomePrices)
    const yes = parseFloat(prices[0]) || 0.5
    const no = parseFloat(prices[1]) || 0.5
    return { yes, no }
  } catch {
    return { yes: 0.5, no: 0.5 }
  }
}

export function detectResolution(outcomePrices: string): 'yes' | 'no' | null {
  try {
    const prices = JSON.parse(outcomePrices)
    const yes = parseFloat(prices[0])
    const no = parseFloat(prices[1])
    if (yes >= 0.99) return 'yes'
    if (no >= 0.99) return 'no'
    return null
  } catch {
    return null
  }
}
