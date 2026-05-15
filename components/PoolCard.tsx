import Link from 'next/link'
import type { Pool } from '@/services/api'
import { formatUsdc, bpsToPercent } from '@/utils/format'

interface Props {
  pool: Pool
}

export default function PoolCard({ pool }: Props) {
  return (
    <Link href={`/pools/${pool.poolId}`}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-indigo-500 transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-white text-lg">{pool.name}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              pool.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}
          >
            {pool.active ? 'Active' : 'Paused'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400">Reserve</p>
            <p className="text-white font-medium">${formatUsdc(pool.reserveBalance)} USDC</p>
          </div>
          <div>
            <p className="text-gray-400">Members</p>
            <p className="text-white font-medium">{pool.totalMembers}</p>
          </div>
          <div>
            <p className="text-gray-400">Premium Rate</p>
            <p className="text-white font-medium">{bpsToPercent(pool.premiumRateBps)} / mo</p>
          </div>
          <div>
            <p className="text-gray-400">Max Claim</p>
            <p className="text-white font-medium">{bpsToPercent(pool.claimRatioBps)} of reserve</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
