# InsureChain — Decentralized Insurance on Stellar

A community-governed mutual insurance marketplace built on Stellar. Users pool USDC into on-chain reserves, pay premiums, and submit claims with IPFS evidence. Elected assessors vote using an FBA quorum model — when quorum is reached, Soroban smart contracts release the payout automatically. No intermediary, no delay.

---

## How It Works

```
Members deposit USDC → reserve pool grows
         ↓
Member pays monthly premium → coverage activated
         ↓
Incident occurs → member uploads evidence to IPFS → submits claim on-chain
         ↓
Assessors review evidence → vote approve/reject on-chain
         ↓
FBA quorum reached → claim auto-finalizes
         ↓
Anyone calls execute_payout → Soroban releases USDC to claimant
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Wallet | Freighter (`@stellar/freighter-api`) |
| Contract calls | `@stellar/stellar-sdk` v13 |
| Server state | React Query v5 |
| Client state | Zustand |
| Backend API | NestJS REST (`http://localhost:3001`) |
| File storage | IPFS via Pinata |

---

## Getting Started

**Prerequisites:** Node.js 18+, [Freighter wallet](https://freighter.app) browser extension.

```bash
npm install
cp .env.local.example .env.local  # add your contract IDs
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000). The NestJS backend must be running at `http://localhost:3001` for data to load.

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_POOL_MANAGER_ID=<deployed contract ID>
NEXT_PUBLIC_CLAIMS_ENGINE_ID=<deployed contract ID>
```

Contract IDs are generated when you deploy to Stellar testnet via `scripts/deploy.sh`.

---

## Pages

| Route | Description |
|---|---|
| `/` | Browse all active insurance pools |
| `/pools/[id]` | Pool detail — deposit or withdraw USDC |
| `/claims` | Your submitted claims and their status |
| `/claims/new` | Submit a new claim with evidence upload |
| `/claims/[id]` | Claim detail, vote breakdown, execute payout |
| `/assessor` | Live voting queue for registered assessors |

---

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/
│   ├── WalletConnect.tsx   # Freighter connect/disconnect
│   ├── PoolCard.tsx        # Pool summary card
│   ├── ClaimForm.tsx       # Claim submission + IPFS upload
│   ├── VotePanel.tsx       # Approve/reject + execute payout
│   └── QuorumBar.tsx       # FBA quorum progress bar
├── hooks/
│   ├── useWallet.ts        # Freighter wallet state (Zustand)
│   ├── usePools.ts         # Pool data from backend
│   ├── useClaims.ts        # Claim data from backend
│   └── useContract.ts      # Soroban transaction hooks
├── services/
│   ├── api.ts              # All REST calls + TypeScript types
│   └── contracts.ts        # Soroban invoke helpers
└── utils/
    ├── format.ts           # USDC/stroop formatting, address truncation
    └── ipfs.ts             # Evidence upload via backend proxy
```

---

## Architecture

All **reads** come from the NestJS backend, which indexes Soroban events into PostgreSQL every 5 seconds. All **writes** go directly on-chain via Freighter — the frontend never writes to the backend database.

```
Frontend (Next.js)
  ├── reads  → NestJS REST API → PostgreSQL (indexed from chain)
  └── writes → Freighter signs → Soroban smart contracts
                                    ├── Pool Manager  (reserves, deposits, payouts)
                                    └── Claims Engine (submit, vote, quorum, payout)
```

---

## Key Concepts

- **Amounts** are in stroops — `1 USDC = 10,000,000 stroops`. Use `formatUsdc()` for display.
- **Premium rate** is in basis points — `200 bps = 2% per month`.
- **Quorum** defaults to 7 assessors with 5/7 approval threshold, mirroring Stellar's FBA model.
- **Evidence** is uploaded to IPFS before the claim is submitted. The CID is stored on-chain — it cannot be altered after submission.

---

## Smart Contracts

| Contract | Responsibility |
|---|---|
| Pool Manager | USDC reserves, LP deposits/withdrawals, premium collection, payout release |
| Claims Engine | Claim lifecycle, assessor voting, FBA quorum logic, cross-contract payout trigger |
| Governance DAO | Protocol parameter proposals, assessor elections *(planned)* |
| Reputation Engine | Assessor scoring, staking, slashing *(planned)* |

---

## Scripts

```bash
npm run dev      # start development server
npm run build    # production build
npm run lint     # ESLint
```

---

## Roadmap

- [x] Pool Manager contract
- [x] Claims Engine contract
- [x] NestJS backend + Soroban indexer
- [x] Frontend — pool list, deposit/withdraw, claim submission, assessor voting
- [ ] Governance DAO contract + UI
- [ ] Reputation Engine contract + assessor leaderboard
- [ ] Parametric insurance (oracle-triggered payouts)
- [ ] Testnet launch + security audit
