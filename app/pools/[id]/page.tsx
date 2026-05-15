'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { usePool, usePosition } from '@/hooks/usePools'
import { useDeposit, useWithdraw } from '@/hooks/useContract'
import { useWallet } from '@/hooks/useWallet'
import { formatUsdc, bpsToPercent } from '@/utils/format'

export default function PoolDetailPage() {
  const { id } = useParams<{ id: string }>()
  const poolId = Number(id)
  const publicKey = useWallet((s) => s.publicKey)

  const { data: pool, isLoading } = usePool(poolId)
  const { data: position, refetch: refetchPosition } = usePosition(poolId, publicKey)

  const { deposit, status: depositStatus } = useDeposit()
  const { withdraw, status: withdrawStatus } = useWithdraw()

  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (tab === 'deposit') {
      await deposit(poolId, amount)
    } else {
      await withdraw(poolId, amount)
    }
    setAmount('')
    refetchPosition()
  }

  const isPending = depositStatus === 'pending' || withdrawStatus === 'pending'

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-800 rounded-xl" />
  if (!pool) return <p className="text-red-400">Pool not found.</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{pool.name}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
            pool.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}
        >
          {pool.active ? 'Active' : 'Paused'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Reserve', value: `$${formatUsdc(pool.reserveBalance)}` },
          { label: 'Members', value: pool.totalMembers },
          { label: 'Premium Rate', value: bpsToPercent(pool.premiumRateBps) + ' / mo' },
          { label: 'Max Claim', value: bpsToPercent(pool.claimRatioBps) + ' of reserve' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-white font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Your position */}
      {publicKey && position && (
        <div className="bg-indigo-900/30 border border-indigo-700 rounded-xl p-4">
          <p className="text-sm text-indigo-300">Your Position</p>
          <p className="text-2xl font-bold text-white">${formatUsdc(position.balance)} USDC</p>
        </div>
      )}

      {/* Deposit / Withdraw */}
      {publicKey ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <div className="flex gap-2 mb-4">
            {(['deposit', 'withdraw'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount in USDC"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isPending || !pool.active}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
            >
              {isPending ? 'Processing…' : tab === 'deposit' ? 'Deposit USDC' : 'Withdraw USDC'}
            </button>
          </form>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Connect your wallet to deposit or withdraw.</p>
      )}
    </div>
  )
}
