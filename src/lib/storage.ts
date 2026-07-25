import type { AppState } from '../types'
import { daysBetween } from './dates'

const KEY = '9days-todo/v1'

export const PURGE_AFTER_DAYS = 30

const EMPTY: AppState = { tasks: [], notebook: [], lastReckoningDate: null }

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      // Migrated in place rather than bumping KEY: `notebook` was added after v1 shipped,
      // and bumping the key would silently orphan every existing task.
      notebook: Array.isArray(parsed.notebook) ? parsed.notebook : [],
      lastReckoningDate: parsed.lastReckoningDate ?? null,
    }
  } catch {
    // Corrupt or unreadable storage shouldn't brick the app.
    return EMPTY
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Quota or private-mode failure. Nothing useful to do; the UI stays usable in-memory.
  }
}

/** Hard-delete archived tasks older than the retention window. */
export function purge(state: AppState, today: string): AppState {
  const tasks = state.tasks.filter((t) => {
    if (t.status === 'active') return true
    const archivedOn = (t.droppedAt ?? t.completedAt ?? t.createdAt).slice(0, 10)
    return daysBetween(archivedOn, today) < PURGE_AFTER_DAYS
  })
  return tasks.length === state.tasks.length ? state : { ...state, tasks }
}
