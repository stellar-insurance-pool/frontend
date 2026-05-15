# Frontend Implementation Guide

This document tells the frontend team exactly what the backend provides and how to build the UI against it.

---

## What the Backend Does

The backend is a NestJS REST API running on `http://localhost:3001`. It does three things:

1. **Indexes Soroban events** — polls the Stellar RPC every 5 seconds and writes on-chain state (pools, claims, votes, assessors) to PostgreSQL
2. **Serves REST endpoints** — the frontend reads all data from these; it never queries the blockchain directly for reads
3. **Proxies IPFS uploads** — the frontend sends evidence files to the backend, which pins them to IPFS via Pinata and returns the CID

The frontend only calls the blockchain directly for **write operations** (deposit, submit claim, vote) via Freighter wallet.

---

## Base URL

```
http://localhost:3001
```

Swagger UI (full interactive docs): `http://localhost:3001/api`

---

## API Reference

### Pools

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/pools` | All active pools |
| `GET` | `/pools/:poolId` | Single pool with reserve stats |
| `GET` | `/pools/:poolId/positions/:address` | LP balance for a wallet address |

**Pool object:**
```json
{
  "poolId": 1,
  "name": "Crop Insurance",
  "token": "USDC_CONTRACT_ADDRESS",
  "reserveBalance": "50000.0000000",
  "premiumRateBps": 200,
  "claimRatioBps": 2000,
  "totalMembers": 42,
  "active": true,
  "updatedAt": "2026-05-15T10:00:00.000Z"
}
```

**Position object:**
```json
{
  "poolId": 1,
  "depositor": "GABC...XYZ",
  "balance": "1000.0000000"
}
```

> `premiumRateBps` — divide by 100 to get percentage (200 bps = 2%)  
> `claimRatioBps` — max payout per claim as % of reserve (2000 bps = 20%)

---

### Claims

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/claims` | All claims |
| `GET` | `/claims?claimant=:address` | Claims by wallet address |
| `GET` | `/claims?status=UnderReview` | Voting queue for assessors |
| `GET` | `/claims/queue` | Alias for voting queue |
| `GET` | `/claims/:claimId` | Claim detail + full vote breakdown |

**Claim statuses:** `Pending` → `UnderReview` → `Approved` / `Rejected` → `Paid`

**Claim object:**
```json
{
  "claimId": 7,
  "poolId": 1,
  "claimant": "GABC...XYZ",
  "amount": "500.0000000",
  "evidenceHash": "QmXyz...",
  "evidenceUrl": "https://gateway.pinata.cloud/ipfs/QmXyz...",
  "status": "UnderReview",
  "approvals": 3,
  "rejections": 1,
  "submittedAt": "2026-05-15T09:00:00.000Z",
  "paidAt": null,
  "votes": [
    { "assessor": "GDEF...ABC", "approved": true, "votedAt": "..." }
  ]
}
```

---

### Assessors

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/assessors` | All active assessors, sorted by score desc |
| `GET` | `/assessors/:address` | Individual assessor stats |

**Assessor object:**
```json
{
  "address": "GDEF...ABC",
  "score": "87.50",
  "totalVotes": 40,
  "correctVotes": 35,
  "stake": "1000.0000000",
  "active": true,
  "registeredAt": "2026-04-01T00:00:00.000Z"
}
```

> `score` is accuracy percentage: `correctVotes / totalVotes * 100`

---

### IPFS Upload

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ipfs/upload` | Upload evidence file, returns CID + URL |

**Request:** `multipart/form-data` with field `file`

**Response:**
```json
{
  "cid": "QmXyz...",
  "url": "https://gateway.pinata.cloud/ipfs/QmXyz..."
}
```

The CID is what gets passed as `evidence_hash` to the `submit_claim` contract call.

---

### Governance

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/governance/proposals` | All proposals |
| `POST` | `/governance/proposals` | Create a proposal |
| `GET` | `/governance/proposals/:proposalId` | Proposal detail |
| `GET` | `/governance/elections` | Active assessor election proposals |

**Create proposal body:**
```json
{
  "proposer": "GABC...XYZ",
  "title": "Increase quorum to 8",
  "action": "set_quorum",
  "params": { "quorum_threshold": 8, "approval_threshold": 6 }
}
```

**Proposal statuses:** `Active` → `Passed` / `Rejected` → `Executed`

---

## Frontend Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Wallet | Freighter via `@stellar/freighter-api` |
| Contract calls | `@stellar/stellar-sdk` |
| Server state | React Query (`@tanstack/react-query`) |
| Client state | Zustand |
| Styling | Tailwind CSS |

---

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx                  # Pool list (landing)
│   ├── pools/[id]/page.tsx       # Pool detail + deposit/withdraw
│   ├── claims/page.tsx           # My claims
│   ├── claims/new/page.tsx       # Submit claim form
│   ├── claims/[id]/page.tsx      # Claim detail + vote status
│   ├── assessor/page.tsx         # Assessor voting queue
│   └── governance/page.tsx       # Proposals + elections
├── components/
│   ├── WalletConnect.tsx         # Freighter connect button
│   ├── PoolCard.tsx              # Pool summary card
│   ├── ClaimForm.tsx             # Claim submission form
│   ├── VotePanel.tsx             # Approve/reject buttons
│   └── QuorumBar.tsx             # Visual quorum progress bar
├── hooks/
│   ├── useWallet.ts              # Freighter wallet state
│   ├── usePools.ts               # Fetch pools from backend
│   ├── useClaims.ts              # Fetch claims from backend
│   └── useContract.ts            # Build + submit Soroban transactions
├── services/
│   ├── api.ts                    # All backend REST calls
│   └── contracts.ts              # Soroban contract invocation helpers
└── utils/
    ├── format.ts                 # Format USDC amounts, addresses
    └── ipfs.ts                   # Upload evidence via backend
```

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_POOL_MANAGER_ID=<deployed contract ID>
NEXT_PUBLIC_CLAIMS_ENGINE_ID=<deployed contract ID>
```

---

## Key Implementation Patterns

### Wallet connection (Freighter)

```typescript
// hooks/useWallet.ts
import { getPublicKey, isConnected, signTransaction } from '@stellar/freighter-api'

export function useWallet() {
  const connect = async () => {
    if (await isConnected()) return getPublicKey()
  }
  return { connect, signTransaction }
}
```

### Calling a contract function

```typescript
// services/contracts.ts
import { Contract, TransactionBuilder, Networks, BASE_FEE, SorobanRpc } from '@stellar/stellar-sdk'

export async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  publicKey: string,
  signTransaction: (xdr: string) => Promise<string>,
) {
  const server = new SorobanRpc.Server(process.env.NEXT_PUBLIC_RPC_URL!)
  const account = await server.getAccount(publicKey)
  const contract = new Contract(contractId)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const prepared = await server.prepareTransaction(tx)
  const signed = await signTransaction(prepared.toXDR())
  return server.sendTransaction(TransactionBuilder.fromXDR(signed, Networks.TESTNET))
}
```

### Fetching data from the backend

```typescript
// services/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL

export const api = {
  pools:       () => fetch(`${BASE}/pools`).then(r => r.json()),
  pool:        (id: number) => fetch(`${BASE}/pools/${id}`).then(r => r.json()),
  position:    (poolId: number, address: string) =>
                 fetch(`${BASE}/pools/${poolId}/positions/${address}`).then(r => r.json()),

  claims:      (params?: { claimant?: string; status?: string }) =>
                 fetch(`${BASE}/claims?${new URLSearchParams(params as any)}`).then(r => r.json()),
  claim:       (id: number) => fetch(`${BASE}/claims/${id}`).then(r => r.json()),
  claimQueue:  () => fetch(`${BASE}/claims/queue`).then(r => r.json()),

  assessors:   () => fetch(`${BASE}/assessors`).then(r => r.json()),
  assessor:    (address: string) => fetch(`${BASE}/assessors/${address}`).then(r => r.json()),

  proposals:   () => fetch(`${BASE}/governance/proposals`).then(r => r.json()),
  elections:   () => fetch(`${BASE}/governance/elections`).then(r => r.json()),
  createProposal: (body: object) =>
                 fetch(`${BASE}/governance/proposals`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(body),
                 }).then(r => r.json()),

  uploadEvidence: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/ipfs/upload`, { method: 'POST', body: form }).then(r => r.json())
  },
}
```

---

## User Flows

### LP deposits into a pool

```
1. Connect Freighter wallet
2. GET /pools → display pool list
3. User picks pool, enters amount
4. invokeContract(POOL_MANAGER_ID, 'deposit', [pool_id, address, amount])
5. Freighter signs → tx submitted
6. Indexer picks up POOL/deposit → DB updated
7. Refresh position: GET /pools/:id/positions/:address
```

### Member submits a claim

```
1. User fills form: pool, amount, description, evidence file
2. POST /ipfs/upload with file → { cid, url }
3. invokeContract(CLAIMS_ENGINE_ID, 'submit_claim', [pool_id, address, amount, cid])
4. Freighter signs → tx submitted
5. Indexer picks up CLAIM/submit → claim row inserted with status Pending
6. Redirect to /claims/:id
```

### Assessor votes on a claim

```
1. GET /claims/queue → list of UnderReview claims
2. Open claim → show evidence via evidenceUrl (IPFS link)
3. Click Approve or Reject
4. invokeContract(CLAIMS_ENGINE_ID, 'vote', [claim_id, address, approve])
5. Freighter signs → tx submitted
6. Indexer picks up CLAIM/vote → approvals/rejections count updated
7. If quorum reached on-chain → CLAIM/final event → status flips to Approved/Rejected
8. For Approved claims: invokeContract(CLAIMS_ENGINE_ID, 'execute_payout', [claim_id])
```

---

## Contract Function Reference

These are the on-chain functions the frontend calls directly. All reads come from the backend REST API instead.

| Contract | Function | Args | Who calls it |
|---|---|---|---|
| pool-manager | `deposit` | `pool_id, depositor, amount` | LP / user |
| pool-manager | `withdraw` | `pool_id, withdrawer, amount` | LP / user |
| pool-manager | `pay_premium` | `pool_id, member, coverage_amount` | Member |
| claims-engine | `submit_claim` | `pool_id, claimant, amount, evidence_hash` | Member |
| claims-engine | `vote` | `claim_id, assessor, approve` | Assessor |
| claims-engine | `execute_payout` | `claim_id` | Anyone (permissionless) |

---

## Pages Checklist

| Page | Route | Data sources | Contract calls |
|---|---|---|---|
| Pool list | `/` | `GET /pools` | — |
| Pool detail | `/pools/[id]` | `GET /pools/:id`, `GET /pools/:id/positions/:address` | `deposit`, `withdraw` |
| My claims | `/claims` | `GET /claims?claimant=:address` | — |
| Submit claim | `/claims/new` | `GET /pools` | `POST /ipfs/upload` → `submit_claim` |
| Claim detail | `/claims/[id]` | `GET /claims/:id` | `execute_payout` (if Approved) |
| Assessor queue | `/assessor` | `GET /claims/queue` | `vote` |
| Governance | `/governance` | `GET /governance/proposals`, `GET /governance/elections` | `POST /governance/proposals` |

---

## Notes

- **All amounts** are in stroops (7 decimal places). Display as `amount / 10_000_000` USDC or use a `formatUsdc` helper.
- **Addresses** are Stellar G-addresses (56 chars). Truncate to `GABC...XYZ` for display.
- **Evidence URLs** are already full Pinata gateway URLs — render directly as `<a href={evidenceUrl}>` or in an `<img>` if the file is an image.
- **Quorum progress** — use `approvals` and `rejections` from the claim object. The default quorum threshold is 7 assessors. Show `approvals / 7` as a progress bar.
- **Polling** — the indexer syncs every 5 seconds. Use React Query's `refetchInterval: 5000` on voting queue and claim detail pages to keep the UI live.
- **DB is read-only from the frontend's perspective** — never write directly to the backend DB. All writes go on-chain; the indexer syncs them back.
