import { useState } from 'react'
import type { Task } from '../types'
import { daysBetween } from '../lib/dates'
import { PURGE_AFTER_DAYS } from '../lib/storage'
import { ShameBadge } from './win95/Badge'

function daysLeft(task: Task, today: string): number {
  const archivedOn = (task.droppedAt ?? task.completedAt ?? task.createdAt).slice(0, 10)
  return PURGE_AFTER_DAYS - daysBetween(archivedOn, today)
}

interface Props {
  tasks: Task[]
  today: string
  /** Un-completing is the one way back out of the archive — see the note below. */
  onRestore: (id: string) => void
}

export function ArchiveView({ tasks, today, onRestore }: Props) {
  const [tab, setTab] = useState<'completed' | 'dropped'>('dropped')
  const shown = tasks.filter((t) => t.status === tab)

  return (
    // A fragment, not a wrapper div: `.tasklist` grows with `flex: 1` and needs `.win__body`
    // as its direct flex parent, or the list hugs its content and leaves a grey void below.
    <>
      <div className="tabs" role="tablist">
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'dropped'}
          onClick={() => setTab('dropped')}
        >
          Graveyard
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'completed'}
          onClick={() => setTab('completed')}
        >
          Completed
        </button>
      </div>

      <ul className="tasklist">
        {shown.length === 0 ? (
          <li className="empty">
            {tab === 'dropped' ? 'No dropped tasks. Yet.' : 'Nothing completed yet.'}
          </li>
        ) : (
          shown.map((t) => (
            <li key={t.id} className="taskrow">
              {/* Ticking a task off is easy to do by accident — a stray click, or the
                  reminder dialog's "Mark done". Un-completing is the way back. Dropped
                  tasks stay dropped: that decision was made deliberately, in a reckoning. */}
              {tab === 'completed' && (
                <input
                  type="checkbox"
                  className="taskrow__check"
                  checked
                  onChange={() => onRestore(t.id)}
                  aria-label={`Put "${t.title}" back on the list`}
                  title="Put this back on the list"
                />
              )}
              <div className="taskrow__main">
                <span style={{ textDecoration: tab === 'completed' ? 'line-through' : 'none' }}>
                  {t.title}
                </span>
                <div className="taskrow__meta">
                  <ShameBadge keepCount={t.keepCount} />
                  <span className="badge">
                    purges in {Math.max(0, daysLeft(t, today))}d
                  </span>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      {/* One line, always: the window height is fixed and this sits below a flexible list. */}
      <p className="notice">
        {tab === 'completed' ? 'Untick to restore.' : 'Dropped for good.'} Purged after{' '}
        {PURGE_AFTER_DAYS} days — no backup.
      </p>
    </>
  )
}
