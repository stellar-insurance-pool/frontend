'use client'
import { useState } from 'react'
import { useWallet, getSignTransaction } from './useWallet'
import * as contracts from '@/services/contracts'
import { parseUsdc } from '@/utils/format'

type TxStatus = 'idle' | 'pending' | 'success' | 'error'

function useTx() {
  const [status, setStatus] = useState<TxStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>) {
    setStatus('pending')
    setError(null)
    try {
      await fn()
      setStatus('success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return { status, error, run }
}

export function useDeposit() {
  const publicKey = useWallet((s) => s.publicKey)
  const tx = useTx()

  const deposit = (poolId: number, amountUsdc: string) =>
    tx.run(async () => {
      if (!publicKey) throw new Error('Wallet not connected')
      const sign = await getSignTransaction()
      await contracts.deposit(poolId, publicKey, parseUsdc(amountUsdc), publicKey, sign)
    })

  return { ...tx, deposit }
}

export function useWithdraw() {
  const publicKey = useWallet((s) => s.publicKey)
  const tx = useTx()

  const withdraw = (poolId: number, amountUsdc: string) =>
    tx.run(async () => {
      if (!publicKey) throw new Error('Wallet not connected')
      const sign = await getSignTransaction()
      await contracts.withdraw(poolId, publicKey, parseUsdc(amountUsdc), publicKey, sign)
    })

  return { ...tx, withdraw }
}

export function useSubmitClaim() {
  const publicKey = useWallet((s) => s.publicKey)
  const tx = useTx()

  const submitClaim = (poolId: number, amountUsdc: string, evidenceCid: string) =>
    tx.run(async () => {
      if (!publicKey) throw new Error('Wallet not connected')
      const sign = await getSignTransaction()
      await contracts.submitClaim(poolId, publicKey, parseUsdc(amountUsdc), evidenceCid, publicKey, sign)
    })

  return { ...tx, submitClaim }
}

export function useVote() {
  const publicKey = useWallet((s) => s.publicKey)
  const tx = useTx()

  const castVote = (claimId: number, approve: boolean) =>
    tx.run(async () => {
      if (!publicKey) throw new Error('Wallet not connected')
      const sign = await getSignTransaction()
      await contracts.vote(claimId, publicKey, approve, publicKey, sign)
    })

  return { ...tx, castVote }
}

export function useExecutePayout() {
  const publicKey = useWallet((s) => s.publicKey)
  const tx = useTx()

  const executePayout = (claimId: number) =>
    tx.run(async () => {
      if (!publicKey) throw new Error('Wallet not connected')
      const sign = await getSignTransaction()
      await contracts.executePayout(claimId, publicKey, sign)
    })

  return { ...tx, executePayout }
}
