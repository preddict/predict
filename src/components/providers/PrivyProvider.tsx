'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#111111',
          logo: 'https://predict-sigma-nine.vercel.app/logo.svg',
        },
        loginMethods: ['email', 'google', 'wallet'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' },
        },
        defaultChain: {
          id: 137,
          name: 'Polygon',
          network: 'matic',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls: { default: { http: ['https://polygon-rpc.com'] } },
          blockExplorers: { default: { name: 'PolygonScan', url: 'https://polygonscan.com' } },
        },
        supportedChains: [
          {
            id: 137,
            name: 'Polygon',
            network: 'matic',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: { default: { http: ['https://polygon-rpc.com'] } },
            blockExplorers: { default: { name: 'PolygonScan', url: 'https://polygonscan.com' } },
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  )
}
