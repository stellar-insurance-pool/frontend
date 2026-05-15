'use client'
import { useVote, useExecutePayout } from '@/hooks/useContract'
import { useWallet } from '@/hooks/useWallet'
import type { Claim } from '@/services/api'
import QuorumBar from './QuorumBar'

interface Props {
  claim: Claim
  onVoted?: () => void
}

export default function VotePanel({ claim, onVoted }: Props) {
  const publicKey = useWallet((s) => s.publicKey)
  const { castVote, status: voteStatus } = useVote()
  const { executePayout, status: payoutStatus } = useExecutePayout()

  const hasVoted = claim.votes?.some((v) => v.assessor === publicKey)
  const isPending = voteStatus === 'pending' || payoutStatus === 'pending'

  async function handleVote(approve: boolean) {
    await castVote(claim.claimId, approve)
    onVoted?.()
  }

  async function handlePayout() {
    await executePayout(claim.claimId)
    onVoted?.()
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
      <QuorumBar approvals={claim.approvals} rejections={claim.rejections} />

      {claim.status === 'UnderReview' && !hasVoted && publicKey && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isPending}
            className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {isPending ? 'Submitting…' : '✓ Approve'}
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isPending}
            className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {isPending ? 'Submitting…' : '✗ Reject'}
          </button>
        </div>
      )}

      {hasVoted && (
        <p className="text-center text-sm text-gray-400">You have already voted on this claim.</p>
      )}

      {claim.status === 'Approved' && (
        <button
          onClick={handlePayout}
          disabled={isPending}
          className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {isPending ? 'Processing…' : 'Execute Payout'}
        </button>
      )}

      {!publicKey && (
        <p className="text-center text-sm text-gray-500">Connect wallet to vote.</p>
      )}
    </div>
  )
}
