import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  rpc as SorobanRpc,
  xdr,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET

export const POOL_MANAGER_ID = process.env.NEXT_PUBLIC_POOL_MANAGER_ID!
export const CLAIMS_ENGINE_ID = process.env.NEXT_PUBLIC_CLAIMS_ENGINE_ID!

export async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  publicKey: string,
  signTransaction: (xdr: string, opts?: { network?: string; networkPassphrase?: string }) => Promise<string>,
) {
  const server = new SorobanRpc.Server(RPC_URL)
  const account = await server.getAccount(publicKey)
  const contract = new Contract(contractId)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const prepared = await server.prepareTransaction(tx)
  const signed = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  })
  const result = await server.sendTransaction(
    TransactionBuilder.fromXDR(signed, NETWORK_PASSPHRASE),
  )
  return result
}

// ---- Typed helpers ----

export function deposit(
  poolId: number,
  depositor: string,
  amount: bigint,
  publicKey: string,
  signTransaction: Parameters<typeof invokeContract>[4],
) {
  return invokeContract(
    POOL_MANAGER_ID,
    'deposit',
    [
      nativeToScVal(poolId, { type: 'u32' }),
      new Address(depositor).toScVal(),
      nativeToScVal(amount, { type: 'i128' }),
    ],
    publicKey,
    signTransaction,
  )
}

export function withdraw(
  poolId: number,
  withdrawer: string,
  amount: bigint,
  publicKey: string,
  signTransaction: Parameters<typeof invokeContract>[4],
) {
  return invokeContract(
    POOL_MANAGER_ID,
    'withdraw',
    [
      nativeToScVal(poolId, { type: 'u32' }),
      new Address(withdrawer).toScVal(),
      nativeToScVal(amount, { type: 'i128' }),
    ],
    publicKey,
    signTransaction,
  )
}

export function submitClaim(
  poolId: number,
  claimant: string,
  amount: bigint,
  evidenceHash: string,
  publicKey: string,
  signTransaction: Parameters<typeof invokeContract>[4],
) {
  return invokeContract(
    CLAIMS_ENGINE_ID,
    'submit_claim',
    [
      nativeToScVal(poolId, { type: 'u32' }),
      new Address(claimant).toScVal(),
      nativeToScVal(amount, { type: 'i128' }),
      nativeToScVal(evidenceHash, { type: 'string' }),
    ],
    publicKey,
    signTransaction,
  )
}

export function vote(
  claimId: number,
  assessor: string,
  approve: boolean,
  publicKey: string,
  signTransaction: Parameters<typeof invokeContract>[4],
) {
  return invokeContract(
    CLAIMS_ENGINE_ID,
    'vote',
    [
      nativeToScVal(claimId, { type: 'u32' }),
      new Address(assessor).toScVal(),
      nativeToScVal(approve, { type: 'bool' }),
    ],
    publicKey,
    signTransaction,
  )
}

export function executePayout(
  claimId: number,
  publicKey: string,
  signTransaction: Parameters<typeof invokeContract>[4],
) {
  return invokeContract(
    CLAIMS_ENGINE_ID,
    'execute_payout',
    [nativeToScVal(claimId, { type: 'u32' })],
    publicKey,
    signTransaction,
  )
}
