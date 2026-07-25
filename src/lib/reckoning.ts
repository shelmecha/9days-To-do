import type { Task } from '../types'

/**
 * Tasks that must be reckoned: still active, and created BEFORE today.
 * Tasks created today are exempt — you can't be shamed for something you just wrote down.
 */
export function reckoningQueue(tasks: Task[], today: string): Task[] {
  return tasks.filter((t) => t.status === 'active' && t.createdDate < today)
}
