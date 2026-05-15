# Decentralized Insurance Pool on Stellar

> A community-governed mutual insurance marketplace powered by Stellar's fast settlement and FBA-inspired consensus — enabling transparent, low-cost protection for underserved markets globally.

---

## What Is This?

A decentralized risk-sharing protocol built on the Stellar network. Users pool USDC into insurance reserves, pay premiums, and submit claims on-chain. A quorum of elected assessors votes to approve or reject each claim. When quorum is reached, Soroban smart contracts release the payout automatically — no intermediary, no delay.

**One-line pitch:**
> *Community-funded reserve pools pay out claims approved by an FBA quorum of elected assessors.*

---

## Why Stellar?

| Advantage | Why It Matters Here |
|---|---|
| Sub-cent transaction fees | Viable for micro-premiums and frequent assessor votes |
| 3–5 second finality | Claims resolve in seconds, not days |
| Soroban smart contracts | Rust-based, auditable, on-chain payout automation |
| Native USDC support | No bridging — Circle USDC works natively |
| FBA consensus model | Stellar's trust-quorum philosophy maps directly onto assessor voting |

---

## Core Concept

```
Farmers pool USDC into "Crop Failure Pool"
         │
         ▼
Members pay monthly premiums
         │
         ▼
Drought damages crops → member submits claim + IPFS evidence
         │
         ▼
Elected assessors review evidence and vote on-chain
         │
         ▼
FBA quorum threshold reached → claim auto-approved
         │
         ▼
Soroban releases USDC payout from reserve → member receives funds
```

---

## System Architecture

```
                     ┌──────────────────────────┐
                     │     Frontend DApp        │
                     │     Next.js + Freighter  │
                     └────────────┬─────────────┘
                                  │ reads (REST)  │ writes (Soroban tx)
                     ┌────────────▼─────────────┐
                     │     NestJS Backend       │
                     │  REST API + Indexer      │
                     └────────────┬─────────────┘
                                  │ polls events
                     ┌────────────▼─────────────┐
                     │  Soroban Smart Contracts │
                     └──────┬──────────┬────────┘
                            │          │
              ┌─────────────▼──┐  ┌────▼──────────────┐
              │  Pool Manager  │  │  Claims Engine     │
              │  (reserves,    │  │  (submit, vote,    │
              │   premiums,    │  │   quorum, payout)  │
              │   LP shares)   │  └────────────────────┘
              └────────────────┘
                            │
              ┌─────────────▼──────────────────┐
              │  Governance DAO + Reputation   │
              │  (elections, slashing, params) │
              └────────────────────────────────┘
```

---

## Smart Contracts

### Contract 1 — Pool Manager

Manages all USDC liquidity. Every deposit, withdrawal, premium payment, and payout flows through this contract.

| Function | Description |
|---|---|
| `create_pool(name, token, premium_rate_bps, claim_ratio_bps)` | Admin creates a new insurance pool |
| `deposit(pool_id, depositor, amount)` | LP deposits USDC, balance recorded |
| `withdraw(pool_id, withdrawer, amount)` | LP withdraws USDC from reserve |
| `pay_premium(pool_id, member, coverage_amount)` | Member pays monthly premium |
| `release_payout(pool_id, recipient, amount)` | Claims engine triggers payout (cross-contract) |
| `set_pool_active(pool_id, active)` | Admin pauses/unpauses a pool |

**On-chain storage:**
```rust
Pool {
  id, name, token,
  reserve_balance, premium_rate_bps,
  total_members, claim_ratio_bps, active
}
```

**Key rules:**
- Only the registered `ClaimsContract` address can call `release_payout`
- `claim_ratio_bps` caps the max single payout as a % of reserve (e.g. 2000 bps = 20% max)
- Premium formula: `coverage_amount × premium_rate_bps / 10000 / 12` (monthly)

---

### Contract 2 — Claims Engine

Handles the full claim lifecycle from submission through assessor voting to payout execution.

| Function | Description |
|---|---|
| `submit_claim(pool_id, claimant, amount, evidence_hash)` | Member submits claim with IPFS CID |
| `vote(claim_id, assessor, approve)` | Assessor casts approve/reject vote |
| `execute_payout(claim_id)` | Anyone triggers cross-contract payout for Approved claim |
| `register_assessor(assessor)` | Admin whitelists an assessor |
| `set_quorum(quorum_threshold, approval_threshold)` | Admin updates quorum rules |

**Claim lifecycle:**
```
Pending → UnderReview → Approved / Rejected → Paid
```

**Key rules:**
- Double-vote prevention enforced on-chain per `(claim_id, assessor)` key
- Auto-finalization: once `approvals + rejections >= quorum_threshold`, status flips immediately
- `execute_payout` is permissionless — anyone can call it once a claim is Approved

---

### Contract 3 — Governance DAO

Decentralized control over protocol parameters and assessor elections.

| Function | Description |
|---|---|
| `create_proposal(proposer, title, action, params)` | Submit a governance proposal |
| `vote_proposal(proposal_id, voter, approve)` | Token-weighted vote |
| `execute_proposal(proposal_id)` | Execute passed proposal (calls target contract) |
| `nominate_assessor(nominee)` | Nominate an address for assessor role |
| `finalize_election(nominee)` | Confirm election if threshold met |
| `emergency_pause(pool_id)` | Multisig-triggered pool pause |

**What proposals can change:**
- Quorum thresholds
- Premium rate percentages
- Assessor elections and removals
- Emergency pool pauses

---

### Contract 4 — Reputation Engine

Tracks assessor behavior over time and enforces accountability through staking and slashing.

| Function | Description |
|---|---|
| `stake(assessor, amount)` | Assessor locks collateral to participate |
| `record_vote_outcome(claim_id, assessor, was_correct)` | Called after claim finalization |
| `slash(assessor, amount)` | Reduce stake for bad votes |
| `get_score(assessor)` | Read reputation score |

**Scoring logic:**
- Score = `correct_votes / total_votes × 100` (accuracy percentage)
- Score below 60% → 10% of stake slashed
- Accurate votes on approved claims earn INSURE token rewards

---

## FBA Quorum Model

Inspired directly by Stellar's Federated Byzantine Agreement. Instead of a single insurer deciding claims, a network of trusted assessors forms quorum slices.

**Default parameters:**
```
Total assessors:      10
Minimum quorum:        7
Approval threshold:  5/7
```

**Example quorum logic:**
```
Claim APPROVED if:
  (Region_A >= 3 approvals AND Region_B >= 2 approvals)
  OR
  (Global quorum >= 7)
```

Each assessor belongs to trust groups, signs claim approvals, and contributes to quorum slices — mirroring how Stellar validators form consensus.

---

## Example Insurance Pools

| Pool | Coverage | Target Users |
|---|---|---|
| Crop Insurance | Weather disasters, drought | Farmers, agricultural cooperatives |
| Health Pool | Emergency medical expenses | Individuals in underserved markets |
| SME Protection | Business interruption losses | Small and medium enterprises |
| Freight Insurance | Shipping and cargo damage | Logistics companies |
| Freelancer Income | Income loss protection | Gig workers, contractors |

---

## Tokenomics

### iUSDC — LP Token
Liquidity providers receive `iUSDC` representing their share of the reserve pool.
- Earns a portion of premium yield
- Redeemable for underlying USDC at any time (subject to reserve ratio)

### INSURE — Governance Token
- Vote on protocol proposals
- Stake to become an assessor
- Earn rewards for accurate claim assessments
- Slashed for fraudulent or consistently wrong votes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust + Soroban SDK |
| Frontend | Next.js 14 (App Router) |
| Wallet | Freighter (`@stellar/freighter-api`) |
| Backend | Node.js + NestJS |
| Database | PostgreSQL + TypeORM |
| Event Indexing | Custom Soroban RPC poller |
| File Storage | IPFS via Pinata |
| Analytics | Grafana + Prometheus |

---

## Full Project Structure

```
stellar-insurance-pool/
├── contracts/
│   ├── pool-manager/          # USDC reserves, LP shares, premium logic
│   │   └── src/
│   │       ├── lib.rs, storage.rs, deposit.rs
│   │       ├── withdraw.rs, premium.rs, events.rs
│   ├── claims-engine/         # Claim lifecycle + FBA voting
│   │   └── src/
│   │       ├── lib.rs, claims.rs, voting.rs
│   │       ├── payout.rs, evidence.rs, quorum.rs
│   ├── governance-dao/        # Proposals, elections, treasury
│   │   └── src/
│   │       ├── proposals.rs, voting.rs
│   │       ├── assessors.rs, treasury.rs
│   └── reputation-engine/     # Scoring, slashing, rewards
│       └── src/
│           ├── scoring.rs, slashing.rs, rewards.rs
│
├── backend/                   # NestJS REST API + Soroban indexer ✅
│   └── src/
│       ├── indexer/           # Polls RPC, syncs events to DB
│       ├── pools/             # GET /pools, /pools/:id, /positions
│       ├── claims/            # GET /claims, /claims/queue
│       ├── assessors/         # GET /assessors
│       ├── ipfs/              # POST /ipfs/upload → Pinata
│       ├── governance/        # GET/POST /governance/proposals
│       └── common/entities/   # TypeORM DB models
│
├── frontend/                  # Next.js DApp
│   ├── app/                   # App Router pages
│   ├── components/            # PoolCard, ClaimForm, VotePanel, QuorumBar
│   ├── hooks/                 # useWallet, usePools, useClaims, useContract
│   ├── services/              # api.ts (REST), contracts.ts (Soroban)
│   └── utils/                 # format.ts, ipfs.ts
│
├── scripts/
│   ├── deploy.sh              # Deploy contracts to testnet
│   ├── seed-data.ts           # Seed test pools and claims
│   └── initialize.ts          # Initialize contracts post-deploy
│
└── docs/
    ├── architecture.md
    ├── quorum-model.md
    ├── security.md
    └── tokenomics.md
```

---

## Security Design

### Assessor Staking
Assessors must lock INSURE tokens as collateral before voting. Malicious or consistently inaccurate assessors are slashed — losing a portion of their stake and voting rights.

### Anti-Fraud Mechanisms

| Mechanism | How It Works |
|---|---|
| Risk scoring | Analyzes claim frequency, wallet history, duplicate evidence hashes |
| Delayed finalization | Large claims above a threshold require additional quorum rounds |
| Emergency multisig | Governance DAO can pause payouts during an active attack |
| Evidence hashing | IPFS CID stored on-chain — evidence cannot be altered after submission |

---

## Claim Flow (End to End)

```
Step 1 — Join Pool
  └─ Deposit USDC → receive iUSDC LP token + coverage policy

Step 2 — Incident Occurs
  └─ Upload evidence file → POST /ipfs/upload → get CID
  └─ Call submit_claim on-chain with CID as evidence_hash

Step 3 — Assessors Review
  └─ Assessors fetch voting queue → GET /claims/queue
  └─ Review evidence via IPFS link
  └─ Vote approve/reject on-chain

Step 4 — Quorum Reached
  └─ Contract auto-finalizes → claim.status = Approved / Rejected

Step 5 — Payout Executed
  └─ Anyone calls execute_payout on-chain
  └─ Pool Manager releases USDC to claimant
  └─ Reserve balance updated
```

---

## Development Roadmap

| Phase | Milestone | Status |
|---|---|---|
| **Phase 1 — MVP** | Pool contract, claims engine, basic voting, IPFS evidence | 🔨 In Progress |
| **Phase 2 — Backend** | NestJS API, Soroban indexer, PostgreSQL schema | ✅ Complete |
| **Phase 3 — Frontend** | Next.js DApp, Freighter wallet, deposit/claim/vote UI | 🔜 Next |
| **Phase 4 — DAO** | Governance contract, assessor elections, staking/slashing | 🔜 Planned |
| **Phase 5 — Advanced** | Fraud detection, reputation scoring, parametric triggers | 🔜 Planned |
| **Phase 6 — Launch** | Testnet launch, liquidity incentives, security audit | 🔜 Planned |

---

## Advanced Features (Post-MVP)

**Parametric Insurance** — Automatic payouts triggered by external oracle data (weather APIs, flight delay feeds) without requiring assessor votes.

**NFT Insurance Policies** — Each active policy is minted as a transferable NFT, enabling a secondary market for coverage.

**Reinsurance Pools** — Pools can insure other pools, creating layered risk distribution across the protocol.

**Cross-Pool Liquidity** — Idle reserves in low-claim pools can be deployed to higher-demand pools, maximizing capital efficiency.

---

## Revenue Model

| Source | Detail |
|---|---|
| Protocol fee | 2–5% cut of every premium payment |
| Investment yield | Idle reserves deployed into low-risk Stellar yield vaults |
| Governance fees | Small INSURE fee to submit a governance proposal |

---

## Real-World Use Cases

| Sector | Use Case | Why It Works |
|---|---|---|
| Agriculture | Crop failure insurance for smallholder farmers | Low premiums viable due to Stellar's micro-fee model |
| Logistics | Shipment and cargo damage coverage | Fast claim resolution matches shipping timelines |
| Healthcare | Emergency medical fund for uninsured individuals | Community pooling lowers individual cost |
| Freelancing | Income protection during client non-payment | Peer assessors understand the domain |
| SMEs | Business interruption coverage | Transparent on-chain reserves build trust |

---

## Integrations

- **Circle USDC** — native stablecoin for all pool reserves and payouts
- **Freighter Wallet** — browser extension for signing Soroban transactions
- **Lobstr Wallet** — mobile wallet support for broader accessibility
- **Pinata** — IPFS pinning service for claim evidence storage
- **Soroban RPC** — event streaming for the backend indexer
