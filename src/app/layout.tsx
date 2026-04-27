import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import PrivyProviderWrapper from '@/components/providers/PrivyProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://predict.app'),
  title: {
    default: 'PREDICT — Prediction Markets',
    template: '%s — PREDICT',
  },
  description: 'Predict the future. Bet on real-world events and earn real money.',
  openGraph: {
    siteName: 'PREDICT',
    type: 'website',
    title: 'PREDICT — Prediction Markets',
    description: 'Predict the future. Bet on real-world events and earn real money.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PREDICT — Prediction Markets',
    description: 'Predict the future. Bet on real-world events and earn real money.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <PrivyProviderWrapper>
          {children}
          <Toaster richColors position="top-right" />
        </PrivyProviderWrapper>
      </body>
    </html>
  )
}
