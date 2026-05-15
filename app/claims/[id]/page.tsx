'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useClaim } from '@/hooks/useClaims'
import VotePanel from '@/components/VotePanel'
import { formatUsdc, formatDate, truncateAddress } from '@/utils/format'

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-900 text-yellow-300',
  UnderReview: 'bg-blue-900 text-blue-300',
  Approved: 'bg-green-900 text-green-300',
  Rejected: 'bg-red-900 text-red-300',
  Paid: 'bg-gray-700 text-gray-300',
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: claim, isLoading, refetch } = useClaim(Number(id))

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-800 rounded-xl" />
  if (!claim) return <p className="text-red-400">Claim not found.</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/claims" className="text-sm text-gray-500 hover:text-gray-300">
          ← My Claims
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-3xl font-bold text-white">Claim #{claim.claimId}</h1>
          <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[claim.status] ?? ''}`}>
            {claim.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
        <Row label="Pool" value={`Pool #${claim.poolId}`} />
        <Row label="Claimant" value={truncateAddress(claim.claimant)} />
        <Row label="Amount" value={`$${formatUsdc(claim.amount)} USDC`} />
        <Row label="Submitted" value={formatDate(claim.submittedAt)} />
        {claim.paidAt && <Row label="Paid At" value={formatDate(claim.paidAt)} />}
        {claim.evidenceUrl && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Evidence</span>
            <a
              href={claim.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              View on IPFS ↗
            </a>
          </div>
        )}
      </div>

      {/* Voting */}
      <VotePanel claim={claim} onVoted={refetch} />

      {/* Vote breakdown */}
      {claim.votes && claim.votes.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Vote Breakdown</h2>
          <div className="space-y-2">
            {claim.votes.map((v) => (
              <div key={v.assessor} className="flex justify-between text-sm">
                <span className="text-gray-400 font-mono">{truncateAddress(v.assessor)}</span>
                <span className={v.approved ? 'text-green-400' : 'text-red-400'}>
                  {v.approved ? '✓ Approved' : '✗ Rejected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}
