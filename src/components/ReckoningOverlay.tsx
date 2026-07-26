import { useEffect, useState } from 'react'
import type { Task } from '../types'
import { Window } from './win95/Window'
import { ShameBadge, TagBadge } from './win95/Badge'

interface Props {
  queue: Task[]
  onKeep: (id: string) => void
  onDrop: (id: string) => void
  onFinish: () => void
}

/**
 * Blocking daily review. No skip, no dismiss, no escape — reaching the list requires a
 * decision on every leftover. An empty queue still ends in a confirmation, because the
 * date must be stamped either way or the reckoning re-fires all day.
 */
export function ReckoningOverlay({ queue, onKeep, onDrop, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const total = queue.length
  const task = queue[index]

  // Focus the heading so screen readers and keyboard users land inside the overlay.
  useEffect(() => {
    document.getElementById('reckoning-heading')?.focus()
  }, [index])

  const decide = (fn: (id: string) => void) => {
    if (!task) return
    fn(task.id)
    setIndex((i) => i + 1)
  }

  const done = index >= total

  return (
    <div className="reckoning" role="dialog" aria-modal="true" aria-labelledby="reckoning-heading">
      <Window title={done ? 'Reckoning complete' : 'The Reckoning'} chrome={false}>
        {done ? (
          <div className="stack">
            <div className="dialog__row">
              <span className="dialog__icon" aria-hidden="true">
                ✅
              </span>
              <div>
                <h2 id="reckoning-heading" tabIndex={-1} className="reckoning__title">
                  {total === 0 ? 'Nothing to reckon' : 'Reckoning complete'}
                </h2>
                <p className="dialog__text">
                  {total === 0
                    ? 'A clean slate. Nothing carried over.'
                    : `You reviewed ${total} ${total === 1 ? 'task' : 'tasks'}.`}
                </p>
              </div>
            </div>
            <div className="right">
              <button className="btn btn--lg" onClick={onFinish} autoFocus>
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="stack">
            {/* The count is the big element, not the task title: a title is unbounded and would
                overflow the fixed frame, whereas "2/7" cannot wrap. */}
            <p className="reckoning__progress">
              <span className="reckoning__count">
                {index + 1}/{total}
              </span>
              <span>decide before continuing</span>
            </p>
            <div className="panel">
              <h2 id="reckoning-heading" tabIndex={-1} className="reckoning__title">
                {task.title}
              </h2>
              {task.notes && <p className="reckoning__notes">{task.notes}</p>}
              <div className="taskrow__meta">
                <ShameBadge keepCount={task.keepCount} />
                {task.tags.map((t) => (
                  <TagBadge key={t} name={t} />
                ))}
              </div>
            </div>
            <p className="dialog__text">
              {task.keepCount >= 6
                ? "You've carried this for a while. Is it real work, or is it a wish?"
                : 'Still worth your time tomorrow?'}
            </p>
            <div className="reckoning__actions">
              <button className="btn btn--lg" onClick={() => decide(onKeep)} autoFocus>
                Keep it
              </button>
              <button className="btn btn--lg" onClick={() => decide(onDrop)}>
                Drop it
              </button>
            </div>
            <p className="reckoning__hint">Dropping takes it off the list for good.</p>
          </div>
        )}
      </Window>
    </div>
  )
}
