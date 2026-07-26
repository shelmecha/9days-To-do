import { useState } from 'react'
import type { Task } from '../types'
import { daysBetween } from '../lib/dates'
import { PURGE_AFTER_DAYS } from '../lib/storage'
import { ShameBadge } from './win95/Badge'

function daysLeft(task: Task, today: string): number {
  const archivedOn = (task.completedAt ?? task.createdAt).slice(0, 10)
  return PURGE_AFTER_DAYS - daysBetween(archivedOn, today)
}

interface Props {
  tasks: Task[]
  today: string
  /** Un-completing is the one way back out of Done — see the note below. */
  onRestore: (id: string) => void
  onClearAll: () => void
}

/**
 * Completed tasks only. There is no view for dropped ones: a drop is a decision to stop
 * caring, and a screen that keeps the corpses around invites second-guessing it.
 */
export function DoneView({ tasks, today, onRestore, onClearAll }: Props) {
  const [confirming, setConfirming] = useState(false)
  const shown = tasks.filter((t) => t.status === 'completed')

  return (
    // A fragment, not a wrapper div: `.tasklist` grows with `flex: 1` and needs `.win__body`
    // as its direct flex parent, or the list hugs its content and leaves a grey void below.
    <>
      <div className="listhead">
        {confirming ? (
          <>
            <span>Clear {shown.length}? No undo.</span>
            <span className="right">
              <button
                className="btn btn--sm"
                onClick={() => {
                  onClearAll()
                  setConfirming(false)
                }}
                autoFocus
              >
                Yes
              </button>
              <button className="btn btn--sm" onClick={() => setConfirming(false)}>
                No
              </button>
            </span>
          </>
        ) : (
          <>
            <span>
              {shown.length} done
            </span>
            {shown.length > 0 && (
              <button className="btn btn--sm" onClick={() => setConfirming(true)}>
                Clear all
              </button>
            )}
          </>
        )}
      </div>

      <ul className="tasklist">
        {shown.length === 0 ? (
          <li className="empty">Nothing finished yet.</li>
        ) : (
          shown.map((t) => (
            <li key={t.id} className="taskrow taskrow--done">
              {/* Ticking a task off is easy to do by accident — a stray click, or the
                  reminder dialog's "Mark done". Un-completing is the way back. */}
              <input
                type="checkbox"
                className="taskrow__check"
                checked
                onChange={() => onRestore(t.id)}
                aria-label={`Put "${t.title}" back on the list`}
                title="Put this back on the list"
              />
              <div className="taskrow__main">
                <span className="taskrow__title--static">{t.title}</span>
                <div className="taskrow__meta">
                  <ShameBadge keepCount={t.keepCount} />
                  <span className="badge">purges in {Math.max(0, daysLeft(t, today))}d</span>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      {/* One line, always: the window height is fixed and this sits below a flexible list. */}
      <p className="notice">Untick to restore. Auto-purged after {PURGE_AFTER_DAYS} days.</p>
    </>
  )
}
