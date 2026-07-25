export type TaskStatus = 'active' | 'completed' | 'dropped'

export interface Task {
  id: string
  title: string
  notes: string
  tags: string[]
  status: TaskStatus
  keepCount: number
  /** The user's LOCAL date (YYYY-MM-DD) at creation. Drives reckoning eligibility. */
  createdDate: string
  createdAt: string
  completedAt?: string
  droppedAt?: string
  /** Local clock time "HH:MM" to be reminded today. Undefined = no reminder. */
  remindAt?: string
  /** Local date this reminder last fired, so it only sounds once per day. */
  remindedDate?: string
}

/**
 * A free-form note. Deliberately NOT a task: notes have no status, no reckoning, and never
 * expire — they are the place for the thinking that a to-do item can't hold. Keeping them
 * in a separate collection is what stops the backlog-must-shrink rule from eating them.
 */
export interface Note {
  id: string
  title: string
  body: string
  /** Pinned notes sort above the rest. */
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface AppState {
  tasks: Task[]
  notebook: Note[]
  /** Local date (YYYY-MM-DD) of the last completed reckoning. null = never reckoned. */
  lastReckoningDate: string | null
}

export type View = 'list' | 'notes' | 'archive'
