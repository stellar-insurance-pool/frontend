/** Convert stroop string/bigint to display USDC string, e.g. "1000.0000000" → "1,000.00" */
export function formatUsdc(amount: string | bigint, decimals = 2): string {
  const raw = typeof amount === 'string' ? parseFloat(amount) : Number(amount) / 1e7
  return raw.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Parse a human USDC string to stroops bigint */
export function parseUsdc(amount: string): bigint {
  const n = parseFloat(amount)
  if (isNaN(n)) return 0n
  return BigInt(Math.round(n * 1e7))
}

/** Truncate a Stellar G-address to GABC...XYZ */
export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/** Convert bps to percentage string, e.g. 200 → "2.00%" */
export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

/** Format ISO date string to locale date */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Convert human USDC amount to stroops bigint (alias) */
export const toStroops = parseUsdc
