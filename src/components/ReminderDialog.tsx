import { useRef } from 'react'
import type { Task } from '../types'
import { Window } from './win95/Window'
import { useDialog } from '../hooks/useDialog'

interface Props {
  task: Task
  onDone: (id: string) => void
  onDismiss: () => void
}

export function ReminderDialog({ task, onDone, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // This dialog opens on a timer, not a click — so if focus isn't handed back on close, the
  // user is left typing into nothing with no idea why.
  useDialog(ref, onDismiss)

  return (
    <div
      className="reckoning"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rem-heading"
      ref={ref}
    >
      <Window title="Reminder" chrome={false}>
        <div className="stack">
          <div className="dialog__row">
            <span className="dialog__icon" aria-hidden="true">
              🔔
            </span>
            <div>
              <h2 id="rem-heading" className="reckoning__title">
                {task.title}
              </h2>
              <p style={{ margin: 0 }}>Scheduled for {task.remindAt}. It's time.</p>
              {task.notes && <p className="reckoning__notes">{task.notes}</p>}
            </div>
          </div>
          <div className="right">
            <button className="btn" onClick={onDismiss}>
              Snooze
            </button>
            <button
              className="btn"
              autoFocus
              onClick={() => {
                onDone(task.id)
                onDismiss()
              }}
            >
              Mark done
            </button>
          </div>
          <p className="notice">Snooze just closes this — the reminder won't sound again today.</p>
        </div>
      </Window>
    </div>
  )
}
