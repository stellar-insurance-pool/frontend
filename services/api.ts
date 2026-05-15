const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  pools: () => get<Pool[]>('/pools'),
  pool: (id: number) => get<Pool>(`/pools/${id}`),
  position: (poolId: number, address: string) =>
    get<Position>(`/pools/${poolId}/positions/${address}`),

  claims: (params?: { claimant?: string; status?: string }) =>
    get<Claim[]>(`/claims?${new URLSearchParams(params as Record<string, string>)}`),
  claim: (id: number) => get<Claim>(`/claims/${id}`),
  claimQueue: () => get<Claim[]>('/claims/queue'),

  assessors: () => get<Assessor[]>('/assessors'),
  assessor: (address: string) => get<Assessor>(`/assessors/${address}`),

  proposals: () => get<Proposal[]>('/governance/proposals'),
  elections: () => get<Proposal[]>('/governance/elections'),
  createProposal: (body: CreateProposalBody) =>
    fetch(`${BASE}/governance/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),

  uploadEvidence: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/ipfs/upload`, { method: 'POST', body: form }).then((r) => r.json()) as Promise<{ cid: string; url: string }>
  },
}

// ---- Types ----
export interface Pool {
  poolId: number
  name: string
  token: string
  reserveBalance: string
  premiumRateBps: number
  claimRatioBps: number
  totalMembers: number
  active: boolean
  updatedAt: string
}

export interface Position {
  poolId: number
  depositor: string
  balance: string
}

export interface Vote {
  assessor: string
  approved: boolean
  votedAt: string
}

export interface Claim {
  claimId: number
  poolId: number
  claimant: string
  amount: string
  evidenceHash: string
  evidenceUrl: string
  status: 'Pending' | 'UnderReview' | 'Approved' | 'Rejected' | 'Paid'
  approvals: number
  rejections: number
  submittedAt: string
  paidAt: string | null
  votes?: Vote[]
}

export interface Assessor {
  address: string
  score: string
  totalVotes: number
  correctVotes: number
  stake: string
  active: boolean
  registeredAt: string
}

export interface Proposal {
  proposalId: number
  proposer: string
  title: string
  action: string
  params: Record<string, unknown>
  yesVotes: number
  noVotes: number
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed'
  createdAt: string
}

export interface CreateProposalBody {
  proposer: string
  title: string
  action: string
  params: Record<string, unknown>
}
