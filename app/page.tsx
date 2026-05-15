'use client'
import { usePools } from '@/hooks/usePools'
import PoolCard from '@/components/PoolCard'

export default function HomePage() {
  const { data: pools, isLoading, error } = usePools()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Insurance Pools</h1>
        <p className="text-gray-400">
          Community-governed mutual insurance powered by Stellar. Deposit USDC to earn yield and
          provide coverage.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl h-40 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4">
          Failed to load pools. Make sure the backend is running at{' '}
          <code className="text-red-300">{process.env.NEXT_PUBLIC_API_URL}</code>.
        </div>
      )}

      {pools && pools.length === 0 && (
        <p className="text-gray-500">No pools found.</p>
      )}

      {pools && pools.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <PoolCard key={pool.poolId} pool={pool} />
          ))}
        </div>
      )}
    </div>
  )
}
