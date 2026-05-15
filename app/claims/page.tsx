'use client'
import Link from 'next/link'
import { useClaims } from '@/hooks/useClaims'
import { useWallet } from '@/hooks/useWallet'
import { formatUsdc, formatDate } from '@/utils/format'

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-900 text-yellow-300',
  UnderReview: 'bg-blue-900 text-blue-300',
  Approved: 'bg-green-900 text-green-300',
  Rejected: 'bg-red-900 text-red-300',
  Paid: 'bg-gray-700 text-gray-300',
}

export default function ClaimsPage() {
  const publicKey = useWallet((s) => s.publicKey)
  const { data: claims, isLoading } = useClaims(publicKey ? { claimant: publicKey } : undefined)

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">Connect your wallet to view your claims.</p>
        <Link href="/" className="text-indigo-400 hover:underline">
          ← Back to pools
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">My Claims</h1>
        <Link
          href="/claims/new"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          + New Claim
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      )}

      {claims && claims.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p>No claims yet.</p>
          <Link href="/claims/new" className="text-indigo-400 hover:underline mt-2 inline-block">
            Submit your first claim →
          </Link>
        </div>
      )}

      {claims && claims.length > 0 && (
        <div className="space-y-3">
          {claims.map((claim) => (
            <Link key={claim.claimId} href={`/claims/${claim.claimId}`}>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-indigo-500 transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">Claim #{claim.claimId}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[claim.status] ?? ''}`}
                    >
                      {claim.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Pool #{claim.poolId} · Submitted {formatDate(claim.submittedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${formatUsdc(claim.amount)} USDC</p>
                  <p className="text-xs text-gray-500">
                    {claim.approvals}✓ {claim.rejections}✗
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
