'use client'
import { useEffect } from 'react'
import { create } from 'zustand'

interface WalletState {
  publicKey: string | null
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

export const useWallet = create<WalletState>((set) => ({
  publicKey: null,
  connecting: false,

  connect: async () => {
    set({ connecting: true })
    try {
      // Dynamic import to avoid SSR issues
      const freighter = await import('@stellar/freighter-api')
      const connected = await freighter.isConnected()
      if (!connected) {
        alert('Please install the Freighter wallet extension.')
        return
      }
      const { address } = await freighter.getAddress()
      set({ publicKey: address })
    } catch (err) {
      console.error('Wallet connect error:', err)
    } finally {
      set({ connecting: false })
    }
  },

  disconnect: () => set({ publicKey: null }),
}))

/** Returns the Freighter signTransaction function (lazy-loaded) */
export async function getSignTransaction() {
  const freighter = await import('@stellar/freighter-api')
  return async (xdr: string, opts?: { networkPassphrase?: string }) => {
    const result = await freighter.signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase,
    })
    return result.signedTxXdr
  }
}
