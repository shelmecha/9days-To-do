/** keepCount -> visible shame tier. Tune the whole ladder here. */

export type ShameTier = 'none' | 'quiet' | 'warn' | 'bad' | 'worst'

export const SHAME_THRESHOLDS = { quiet: 1, warn: 3, bad: 6, worst: 9 } as const

export function shameTier(keepCount: number): ShameTier {
  if (keepCount >= SHAME_THRESHOLDS.worst) return 'worst'
  if (keepCount >= SHAME_THRESHOLDS.bad) return 'bad'
  if (keepCount >= SHAME_THRESHOLDS.warn) return 'warn'
  if (keepCount >= SHAME_THRESHOLDS.quiet) return 'quiet'
  return 'none'
}

export function shameLabel(keepCount: number): string | null {
  const tier = shameTier(keepCount)
  if (tier === 'none') return null
  if (tier === 'worst') return `Kept ${keepCount}× — be honest`
  return `Kept ${keepCount}×`
}
