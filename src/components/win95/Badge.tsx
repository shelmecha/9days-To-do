import { shameTier, shameLabel } from '../../lib/shame'

export function ShameBadge({ keepCount }: { keepCount: number }) {
  const label = shameLabel(keepCount)
  if (!label) return null
  const tier = shameTier(keepCount)
  return (
    <span className={`badge badge--${tier}`}>
      {tier === 'worst' && <span aria-hidden="true">⛔ </span>}
      {label}
    </span>
  )
}

export function TagBadge({ name }: { name: string }) {
  return <span className="badge badge--tag">{name}</span>
}
