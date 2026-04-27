import Header from '@/components/layout/Header'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Learn how PREDICT prediction markets work — bet on real events, earn real money.',
}

const sections = [
  {
    emoji: '📈',
    title: 'What is a prediction market?',
    body: `A prediction market lets you bet on the outcome of real-world events. Each market has two sides: YES (it will happen) and NO (it won't). The price of YES reflects the crowd's estimated probability — if YES trades at 70%, the crowd believes there is a 70% chance it happens.`,
  },
  {
    emoji: '💰',
    title: 'How do I make money?',
    body: `You buy shares of the side you believe in. If you're right, each share pays out $1.00. If you're wrong, you lose what you invested. Prices change as more people bet — you can also sell your position early to lock in profit or cut losses before the market closes.`,
  },
  {
    emoji: '⚖️',
    title: 'How are prices set? (LMSR)',
    body: `PREDICT uses LMSR (Logarithmic Market Scoring Rule) — an automated market maker. This means you can always buy or sell without needing a counterparty. The price adjusts automatically based on how much has been bet on each side. Higher demand for YES drives the YES price up and NO down.`,
  },
  {
    emoji: '🏦',
    title: 'Deposits and withdrawals',
    body: `Funds are held in your embedded wallet as USDC on Polygon. To deposit, go to Portfolio → Deposit, copy your wallet address, and send USDC from any exchange or wallet. To withdraw, go to Portfolio → Withdraw and enter the amount and your external wallet address. Withdrawals are processed within 24 hours.`,
  },
  {
    emoji: '🏆',
    title: 'Leaderboard',
    body: `Every trade you make contributes to your realized P&L (profit and loss). The leaderboard ranks traders by their total realized gains across all resolved markets. You can filter by category to see who leads in politics, crypto, sports, and more.`,
  },
  {
    emoji: '🔒',
    title: 'Security',
    body: `Your wallet is an embedded wallet managed by Privy — you don't need to install MetaMask or manage seed phrases. The wallet is tied to your email or social login. All funds are held on-chain in USDC; PREDICT does not custody your assets.`,
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground">How it works</h1>
          <p className="text-muted-foreground mt-2 text-base">Everything you need to know to start trading on PREDICT.</p>
        </div>

        <div className="space-y-8">
          {sections.map(s => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <span className="text-2xl shrink-0 mt-0.5">{s.emoji}</span>
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-2">{s.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-foreground text-background p-6 text-center">
          <p className="font-semibold text-base mb-1">Ready to start?</p>
          <p className="text-sm opacity-70 mb-4">Deposit funds and place your first bet in minutes.</p>
          <a
            href="/portfolio"
            className="inline-block px-6 py-2.5 rounded-xl bg-background text-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Portfolio →
          </a>
        </div>
      </main>
    </div>
  )
}
