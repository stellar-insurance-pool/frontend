import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import WalletConnect from '@/components/WalletConnect'
import Link from 'next/link'

const geist = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InsureChain — Decentralized Insurance on Stellar',
  description: 'Community-governed mutual insurance marketplace powered by Stellar and Soroban.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <Providers>
          <header className="border-b border-gray-800 sticky top-0 z-50 bg-gray-950/90 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <nav className="flex items-center gap-6">
                <Link href="/" className="font-bold text-indigo-400 text-lg">
                  InsureChain
                </Link>
                <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Pools
                </Link>
                <Link href="/claims" className="text-sm text-gray-400 hover:text-white transition-colors">
                  My Claims
                </Link>
                <Link href="/claims/new" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Submit Claim
                </Link>
                <Link href="/assessor" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Assessor
                </Link>
              </nav>
              <WalletConnect />
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
