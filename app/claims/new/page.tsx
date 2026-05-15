import ClaimForm from '@/components/ClaimForm'
import Link from 'next/link'

export default function NewClaimPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/claims" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← My Claims
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">Submit a Claim</h1>
        <p className="text-gray-400 mt-1">
          Upload your evidence to IPFS and submit your claim on-chain for assessor review.
        </p>
      </div>
      <ClaimForm />
    </div>
  )
}
