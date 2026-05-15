const QUORUM_THRESHOLD = 7

interface Props {
  approvals: number
  rejections: number
  quorum?: number
}

export default function QuorumBar({ approvals, rejections, quorum = QUORUM_THRESHOLD }: Props) {
  const total = approvals + rejections
  const approvalPct = total > 0 ? (approvals / quorum) * 100 : 0
  const rejectionPct = total > 0 ? (rejections / quorum) * 100 : 0
  const progress = Math.min((total / quorum) * 100, 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-400">
        <span>Quorum Progress</span>
        <span>
          {total} / {quorum} votes
        </span>
      </div>

      {/* Combined bar */}
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${Math.min(approvalPct, 100)}%` }}
        />
        <div
          className="h-full bg-red-500 transition-all"
          style={{ width: `${Math.min(rejectionPct, 100 - approvalPct)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-green-400">✓ {approvals} approve</span>
        <span className="text-gray-500">{Math.round(progress)}% of quorum</span>
        <span className="text-red-400">{rejections} reject ✗</span>
      </div>
    </div>
  )
}
