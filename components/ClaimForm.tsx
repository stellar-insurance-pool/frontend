'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePools } from '@/hooks/usePools'
import { useSubmitClaim } from '@/hooks/useContract'
import { useWallet } from '@/hooks/useWallet'
import { uploadEvidence } from '@/utils/ipfs'

export default function ClaimForm() {
  const router = useRouter()
  const { data: pools } = usePools()
  const { submitClaim, status } = useSubmitClaim()
  const publicKey = useWallet((s) => s.publicKey)

  const [poolId, setPoolId] = useState('')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isPending = status === 'pending'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!publicKey) return alert('Connect your wallet first.')
    if (!file) return alert('Please attach evidence.')

    setUploadError(null)
    try {
      const { cid } = await uploadEvidence(file)
      await submitClaim(Number(poolId), amount, cid)
      router.push('/claims')
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Pool</label>
        <select
          required
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Select a pool…</option>
          {pools?.map((p) => (
            <option key={p.poolId} value={p.poolId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Claim Amount (USDC)</label>
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 500"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Evidence File</label>
        <input
          ref={fileRef}
          type="file"
          required
          accept="image/*,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-700 file:text-white hover:file:bg-indigo-600"
        />
        {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
      </div>

      {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}

      <button
        type="submit"
        disabled={isPending || !publicKey}
        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
      >
        {isPending ? 'Submitting…' : 'Submit Claim'}
      </button>
    </form>
  )
}
