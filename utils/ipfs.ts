import { api } from '@/services/api'

/** Upload a file to IPFS via the backend proxy. Returns { cid, url }. */
export async function uploadEvidence(file: File): Promise<{ cid: string; url: string }> {
  return api.uploadEvidence(file)
}

/** Build a Pinata gateway URL from a raw CID */
export function ipfsUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`
}
