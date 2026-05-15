'use client'
import { useWallet } from '@/hooks/useWallet'
import { truncateAddress } from '@/utils/format'

export default function WalletConnect() {
  const { publicKey, connecting, connect, disconnect } = useWallet()

  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-300 font-mono">{truncateAddress(publicKey)}</span>
        <button
          onClick={disconnect}
          className="text-xs px-3 py-1 rounded-full border border-gray-600 text-gray-300 hover:border-red-400 hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
    >
      {connecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  )
}
