'use client'
import Link from 'next/link'
import { useClaimQueue } from '@/hooks/useClaims'
import { useWallet } from '@/hooks/useWallet'
import { formatUsdc, formatDate, truncateAddress } from '@/utils/format'
import QuorumBar from '@/components/QuorumBar'

export default function AssessorPage() {
  const publicKey = useWallet((s) => s.publicKey)
  const { data: queue, isLoading } = useClaimQueue()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Assessor Queue</h1>
        <p className="text-gray-400 mt-1">
          Review evidence and vote on pending claims. Votes are recorded on-chain.
        </p>
      </div>

      {!publicKey && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6 text-yellow-300 text-sm">
          Connect your wallet to cast votes.
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl h-28 animate-pulse" />
          ))}
        </div>
      )}

      {queue && queue.length === 0 && (
        <p className="text-gray-500 text-center py-16">No claims pending review.</p>
      )}

      {queue && queue.length > 0 && (
        <div className="space-y-4">
          {queue.map((claim) => (
            <div key={claim.claimId} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link
                    href={`/claims/${claim.claimId}`}
                    className="text-white font-semibold hover:text-indigo-400 transition-colors"
                  >
                    Claim #{claim.claimId}
                  </Link>
                  <p className="text-sm text-gray-400">
                    Pool #{claim.poolId} · {truncateAddress(claim.claimant)} ·{' '}
                    {formatDate(claim.submittedAt)}
                  </p>
                </div>
                <span className="text-white font-semibold">${formatUsdc(claim.amount)} USDC</span>
              </div>

              <QuorumBar approvals={claim.approvals} rejections={claim.rejections} />

              {claim.evidenceUrl && (
                <a
                  href={claim.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-xs text-indigo-400 hover:underline"
                >
                  View Evidence ↗
                </a>
              )}

              <div className="mt-3 text-right">
                <Link
                  href={`/claims/${claim.claimId}`}
                  className="text-sm text-indigo-400 hover:underline"
                >
                  Vote on this claim →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
