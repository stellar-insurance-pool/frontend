# Structure & Implementation Flow

This document is the handoff guide for the full project. It covers what the contracts already do, what still needs to be built in the contract repo, and how the backend and frontend teams should implement against them.

---

## Part 1 — Contracts Already Implemented

### pool-manager

**What it does:**
Manages all insurance pool liquidity. It is the treasury of the protocol — all USDC flows through it.

**Storage:**
```
Pool {
  id, name, token (USDC address),
  reserve_balance, premium_rate_bps,
  total_members, claim_ratio_bps, active
}

DataKey::Pool(pool_id)          → Pool struct
DataKey::Member(pool_id, addr)  → i128 (LP deposit balance)
DataKey::PoolCount              → u32
DataKey::Admin                  → Address
DataKey::ClaimsContract         → Address
```

**Functions:**

| Function | Who calls it | What it does |
|---|---|---|
| `initialize(admin, claims_contract)` | Deployer (once) | Sets admin + links claims-engine |
| `create_pool(name, token, premium_rate_bps, claim_ratio_bps)` | Admin | Creates a new pool with rate config |
| `deposit(pool_id, depositor, amount)` | LP / user | Transfers USDC in, records LP balance |
| `withdraw(pool_id, withdrawer, amount)` | LP / user | Returns USDC, reduces reserve |
| `pay_premium(pool_id, member, coverage_amount)` | Member | Calculates monthly premium, transfers to reserve |
| `release_payout(pool_id, recipient, amount)` | claims-engine only | Pays approved claim, enforces claim ratio cap |
| `set_pool_active(pool_id, active)` | Admin | Pause / unpause a pool |
| `get_pool(pool_id)` | Anyone | Read pool state |
| `get_member_balance(pool_id, member)` | Anyone | Read LP deposit balance |
| `get_pool_count()` | Anyone | Total pools created |

**Key rules enforced on-chain:**
- `release_payout` requires auth from the registered `ClaimsContract` address — no other caller can trigger it
- `claim_ratio_bps` caps the max payout per claim as a % of the reserve (e.g. 2000 bps = max 20% per claim)
- Premium formula: `coverage_amount × premium_rate_bps / 10000 / 12` (monthly)
- Checks-effects-interactions pattern on withdraw — state updated before token transfer

---

### claims-engine

**What it does:**
Handles the full claim lifecycle from submission through assessor voting to payout execution. Calls pool-manager cross-contract to release funds.

**Storage:**
```
Claim {
  id, pool_id, claimant, amount,
  evidence_hash (IPFS CID as Bytes),
  status (Pending|UnderReview|Approved|Rejected|Paid),
  approvals, rejections, submitted_at (ledger timestamp)
}

DataKey::Claim(claim_id)         → Claim struct
DataKey::ClaimCount              → u32
DataKey::Assessor(addr)          → bool (is registered)
DataKey::AssessorCount           → u32
DataKey::Vote(claim_id, addr)    → bool (has voted)
DataKey::Admin                   → Address
DataKey::PoolContract            → Address
DataKey::QuorumThreshold         → u32 (default 7)
DataKey::ApprovalThreshold       → u32 (default 5)
```

**Functions:**

| Function | Who calls it | What it does |
|---|---|---|
| `initialize(admin, pool_contract, quorum_threshold, approval_threshold)` | Deployer (once) | Sets admin, links pool-manager, sets quorum |
| `register_assessor(assessor)` | Admin | Whitelists an assessor address |
| `remove_assessor(assessor)` | Admin | Removes assessor from whitelist |
| `submit_claim(pool_id, claimant, amount, evidence_hash)` | Member | Creates claim record, stores IPFS hash |
| `vote(claim_id, assessor, approve)` | Assessor | Casts vote; auto-finalizes when quorum hit |
| `execute_payout(claim_id)` | Anyone | Triggers cross-contract payout for Approved claim |
| `set_quorum(quorum_threshold, approval_threshold)` | Admin | Updates quorum rules |
| `get_claim(claim_id)` | Anyone | Read full claim state |
| `is_assessor(address)` | Anyone | Check if address is registered assessor |
| `has_voted(claim_id, assessor)` | Anyone | Check if assessor already voted |

**Key rules enforced on-chain:**
- Double-vote prevention: `Vote(claim_id, assessor)` key checked before recording
- Auto-finalization: the moment `approvals + rejections >= quorum_threshold`, claim status flips to `Approved` or `Rejected` — no separate step needed
- `execute_payout` is permissionless once a claim is `Approved` — anyone can call it to trigger the cross-contract transfer
- Evidence hash is required and stored on-chain (IPFS CID uploaded off-chain, hash stored on-chain)

---

## Part 2 — Contracts Still to Build (Remaining 50%)

### governance-dao

**Purpose:** Decentralized control over protocol parameters and assessor elections.

**File structure to create:**
```
contracts/governance-dao/
└── src/
    ├── lib.rs         # Contract entry point
    ├── storage.rs     # Proposal struct, VoteRecord, DataKey
    ├── proposals.rs   # Create / execute proposals
    ├── voting.rs      # Token-weighted voting
    ├── assessors.rs   # Assessor election logic
    ├── treasury.rs    # Protocol fee management
    └── events.rs      # On-chain events
```

**Functions to implement:**

| Function | Description |
|---|---|
| `initialize(admin, insure_token, claims_contract, pool_contract)` | One-time setup |
| `create_proposal(proposer, title, action, params)` | Submit a governance proposal |
| `vote_proposal(proposal_id, voter, approve)` | Token-weighted vote |
| `execute_proposal(proposal_id)` | Execute passed proposal (calls target contract) |
| `nominate_assessor(nominee)` | Nominate an address for assessor role |
| `vote_assessor(nominee, voter)` | Vote to elect a nominee |
| `finalize_election(nominee)` | Confirm election if threshold met, calls `register_assessor` |
| `emergency_pause(pool_id)` | Multisig-triggered pause |
| `get_proposal(proposal_id)` | Read proposal state |

**Storage to define:**
```rust
Proposal { id, proposer, title, action, params, yes_votes, no_votes, status, created_at }
ProposalStatus { Active, Passed, Rejected, Executed }
DataKey::Proposal(u32), DataKey::ProposalCount, DataKey::ElectionVote(addr, addr)
```

**Cross-contract calls it makes:**
- `claims_engine.register_assessor()` — after successful election
- `claims_engine.set_quorum()` — after quorum parameter proposal passes
- `pool_manager.set_pool_active()` — for emergency pause proposals

---

### reputation-engine

**Purpose:** Track assessor behavior over time. Slash bad actors. Reward accurate ones.

**File structure to create:**
```
contracts/reputation-engine/
└── src/
    ├── lib.rs       # Contract entry point
    ├── storage.rs   # AssessorRecord, DataKey
    ├── scoring.rs   # Update score on claim resolution
    ├── slashing.rs  # Slash stake for bad votes
    ├── rewards.rs   # Distribute rewards for accurate votes
    └── events.rs    # On-chain events
```

**Functions to implement:**

| Function | Description |
|---|---|
| `initialize(admin, claims_contract, stake_token)` | One-time setup |
| `stake(assessor, amount)` | Assessor locks collateral to participate |
| `unstake(assessor, amount)` | Withdraw stake (if not slashed) |
| `record_vote_outcome(claim_id, assessor, was_correct)` | Called by claims-engine after finalization |
| `slash(assessor, amount)` | Reduce stake for fraudulent/wrong votes |
| `get_score(assessor)` | Read assessor reputation score |
| `get_stake(assessor)` | Read staked balance |

**Storage to define:**
```rust
AssessorRecord { address, stake, score, total_votes, correct_votes, slashed_amount }
DataKey::Record(Address), DataKey::Admin, DataKey::ClaimsContract, DataKey::StakeToken
```

**Scoring logic:**
- Score = `correct_votes / total_votes * 100` (percentage accuracy)
- Slash threshold: score drops below 60% → slash 10% of stake
- Reward: accurate vote on approved claim → small INSURE token reward

---

## Part 3 — Backend Implementation

The backend indexes on-chain events, serves data to the frontend, handles IPFS uploads, and sends notifications.

### Stack
- **Runtime:** Node.js with NestJS
- **Database:** PostgreSQL
- **Queue:** Bull (Redis-backed) for async jobs
- **IPFS:** Pinata SDK for evidence uploads

### Folder structure
```
backend/
├── src/
│   ├── indexer/          # Listens to Soroban events, writes to DB
│   ├── pools/            # REST API: pool list, pool detail, LP positions
│   ├── claims/           # REST API: submit claim, claim status, claim history
│   ├── assessors/        # REST API: assessor list, voting queue, reputation
│   ├── governance/       # REST API: proposals, elections
│   ├── ipfs/             # Pinata upload service
│   ├── notifications/    # Email / push on claim status change
│   └── common/           # DB models, Stellar RPC client, config
```

### Database tables

```sql
-- Mirrors on-chain pool state
pools (id, pool_id, name, token, reserve_balance, premium_rate_bps,
       claim_ratio_bps, total_members, active, updated_at)

-- Mirrors on-chain claim state
claims (id, claim_id, pool_id, claimant, amount, evidence_hash,
        evidence_url, status, approvals, rejections, submitted_at, paid_at)

-- LP deposit positions
positions (id, pool_id, depositor, balance, updated_at)

-- Assessor registry + reputation
assessors (id, address, score, total_votes, correct_votes,
           stake, active, registered_at)

-- Vote records
votes (id, claim_id, assessor, approved, voted_at)

-- Governance proposals
proposals (id, proposal_id, proposer, title, action,
           yes_votes, no_votes, status, created_at, executed_at)
```

### Indexer — how to implement

The indexer polls Soroban RPC for contract events and writes to the DB.

```
GET /events?contract=<POOL_MANAGER_ID>&start_ledger=<n>
GET /events?contract=<CLAIMS_ENGINE_ID>&start_ledger=<n>
```

Events to handle:

| Contract | Event topic | Action |
|---|---|---|
| pool-manager | `POOL/created` | Insert pool row |
| pool-manager | `POOL/deposit` | Upsert position, update reserve |
| pool-manager | `POOL/withdraw` | Update position, update reserve |
| pool-manager | `POOL/premium` | Update reserve balance |
| pool-manager | `POOL/payout` | Update reserve balance |
| claims-engine | `CLAIM/submit` | Insert claim row |
| claims-engine | `CLAIM/vote` | Insert vote row, update claim counts |
| claims-engine | `CLAIM/final` | Update claim status |
| claims-engine | `CLAIM/paid` | Update claim status to PAID |
| claims-engine | `ASSOR/reg` | Insert/update assessor row |

### IPFS upload flow

Before calling `submit_claim` on-chain, the frontend uploads evidence to IPFS via the backend:

```
POST /ipfs/upload          → { file } → Pinata → returns CID
                                                      ↓
                                         frontend calls submit_claim(... evidence_hash=CID)
```

### Key API endpoints

```
GET  /pools                          List all active pools
GET  /pools/:id                      Pool detail + reserve stats
GET  /pools/:id/positions/:address   LP balance for address

POST /claims                         Submit claim (triggers IPFS upload + on-chain tx)
GET  /claims/:id                     Claim detail + vote breakdown
GET  /claims?claimant=:address       Claims by user
GET  /claims?status=UnderReview      Voting queue for assessors

GET  /assessors                      All registered assessors + scores
GET  /assessors/:address             Individual assessor stats

POST /ipfs/upload                    Upload evidence file, returns CID

GET  /governance/proposals           All proposals
POST /governance/proposals           Create proposal
GET  /governance/elections           Active assessor elections
```

---

## Part 4 — Frontend Implementation

### Stack
- **Framework:** Next.js 14 (App Router)
- **Wallet:** Freighter (via `@stellar/freighter-api`)
- **Contract calls:** `@stellar/stellar-sdk` + `soroban-client`
- **State:** React Query for server state, Zustand for wallet/session
- **Styling:** Tailwind CSS

### Folder structure
```
frontend/
├── app/
│   ├── page.tsx               # Landing / pool list
│   ├── pools/[id]/page.tsx    # Pool detail + deposit/withdraw
│   ├── claims/page.tsx        # My claims
│   ├── claims/new/page.tsx    # Submit claim form
│   ├── claims/[id]/page.tsx   # Claim detail + vote status
│   ├── assessor/page.tsx      # Assessor voting queue
│   └── governance/page.tsx    # Proposals + elections
├── components/
│   ├── WalletConnect.tsx      # Freighter connect button
│   ├── PoolCard.tsx           # Pool summary card
│   ├── ClaimForm.tsx          # Claim submission form
│   ├── VotePanel.tsx          # Approve/reject buttons for assessors
│   └── QuorumBar.tsx          # Visual quorum progress
├── hooks/
│   ├── useWallet.ts           # Freighter wallet state
│   ├── usePools.ts            # Fetch pools from backend
│   ├── useClaims.ts           # Fetch claims from backend
│   └── useContract.ts         # Build + submit Soroban transactions
├── services/
│   ├── api.ts                 # Backend REST calls
│   └── contracts.ts           # Soroban contract invocation helpers
└── utils/
    ├── format.ts              # Format USDC amounts, addresses
    └── ipfs.ts                # Upload evidence via backend
```

### Wallet connection

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
import { Contract, TransactionBuilder, Networks, BASE_FEE } from '@stellar/stellar-sdk'

export async function invokeContract(
  contractId: string,
  method: string,
  args: any[],
  publicKey: string,
  signTransaction: (xdr: string) => Promise<string>
) {
  const server = new SorobanRpc.Server(process.env.NEXT_PUBLIC_RPC_URL)
  const account = await server.getAccount(publicKey)
  const contract = new Contract(contractId)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const prepared = await server.prepareTransaction(tx)
  const signed = await signTransaction(prepared.toXDR())
  return server.sendTransaction(TransactionBuilder.fromXDR(signed, Networks.TESTNET))
}
```

### Key user flows

**LP deposits into a pool:**
```
1. User connects Freighter wallet
2. Frontend calls GET /pools → displays pool list
3. User selects pool, enters amount
4. Frontend calls invokeContract(POOL_MANAGER, 'deposit', [pool_id, address, amount])
5. Freighter prompts user to sign
6. Backend indexer picks up POOL/deposit event → updates DB
7. UI refreshes position via GET /pools/:id/positions/:address
```

**Member submits a claim:**
```
1. User fills claim form (amount, description, uploads evidence file)
2. Frontend POST /ipfs/upload → gets back IPFS CID
3. Frontend calls invokeContract(CLAIMS_ENGINE, 'submit_claim', [pool_id, address, amount, CID])
4. Freighter prompts user to sign
5. Backend indexer picks up CLAIM/submit event → inserts claim row
6. UI redirects to /claims/:id showing Pending status
```

**Assessor votes on a claim:**
```
1. Assessor opens /assessor → sees voting queue (GET /claims?status=UnderReview)
2. Assessor reviews evidence (fetched from IPFS via stored CID)
3. Assessor clicks Approve or Reject
4. Frontend calls invokeContract(CLAIMS_ENGINE, 'vote', [claim_id, address, approve])
5. If quorum reached on-chain → claim auto-finalizes
6. If Approved → anyone can call execute_payout to trigger transfer
```

### Environment variables

```env
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_POOL_MANAGER_ID=<from .env.contracts>
NEXT_PUBLIC_CLAIMS_ENGINE_ID=<from .env.contracts>
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Summary — What to Build Next

| Priority | Repo | Task |
|---|---|---|
| 1 | contract | Implement `governance-dao` contract |
| 2 | contract | Implement `reputation-engine` contract |
| 3 | backend | Set up NestJS project + PostgreSQL schema |
| 4 | backend | Build Soroban event indexer |
| 5 | backend | Build REST API (pools, claims, assessors) |
| 6 | backend | Build IPFS upload service (Pinata) |
| 7 | frontend | Wallet connection + contract invocation helpers |
| 8 | frontend | Pool list + deposit/withdraw UI |
| 9 | frontend | Claim submission form + IPFS upload |
| 10 | frontend | Assessor voting queue + quorum progress UI |
