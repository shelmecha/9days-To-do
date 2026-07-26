import { useRef, useState } from 'react'
import type { Task } from '../types'
import { Window } from './win95/Window'
import { useDialog } from '../hooks/useDialog'
import { playChime, primeAudio } from '../lib/chime'
import { currentTimeString, isValidTime, minutesOfDay } from '../lib/reminders'

interface Props {
  task: Task
  onSave: (id: string, patch: Partial<Task>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function TaskDetail({ task, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [tagText, setTagText] = useState(task.tags.join(', '))
  const [remindAt, setRemindAt] = useState(task.remindAt ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useDialog(ref, onClose)

  const nowMins = minutesOfDay(currentTimeString(new Date())) ?? 0
  const targetMins = isValidTime(remindAt) ? minutesOfDay(remindAt) : null
  const isPast = targetMins !== null && targetMins < nowMins

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) return // a task with no title isn't a task
    const tags = Array.from(
      new Set(
        tagText
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .map((t) => t.slice(0, 30)),
      ),
    )

    const patch: Partial<Task> = {
      title: trimmed.slice(0, 200),
      notes: notes.slice(0, 2000),
      tags,
    }

    if (isValidTime(remindAt)) {
      patch.remindAt = remindAt
      // Changing the time re-arms the reminder; clearing the stamp lets it fire again today.
      patch.remindedDate = task.remindAt === remindAt ? task.remindedDate : undefined
    } else {
      patch.remindAt = undefined
      patch.remindedDate = undefined
    }

    onSave(task.id, patch)
    onClose()
  }

  return (
    <div className="reckoning" role="dialog" aria-modal="true" aria-label="Task properties" ref={ref}>
      <Window title="Task properties" chrome={false}>
        <div className="stack">
          <div>
            <label className="label" htmlFor="td-title">
              Title
            </label>
            <input
              id="td-title"
              className="field"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="td-notes">
              Notes
            </label>
            <textarea
              id="td-notes"
              className="field"
              value={notes}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="td-tags">
              Tags (comma separated)
            </label>
            <input
              id="td-tags"
              className="field"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="work, admin"
            />
          </div>
          <div>
            <label className="label" htmlFor="td-remind">
              Remind me today at
            </label>
            {/* .row, not .quickadd: this only wants the flex layout, and .quickadd's bottom
                margin stacked on .stack's gap, pushing this one group out of line. */}
            <div className="row">
              <input
                id="td-remind"
                className="field"
                type="time"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
              <button
                className="btn"
                type="button"
                onClick={() => {
                  primeAudio()
                  playChime()
                }}
                title="Preview the reminder sound"
              >
                Test
              </button>
              {remindAt && (
                <button className="btn" type="button" onClick={() => setRemindAt('')}>
                  Clear
                </button>
              )}
            </div>
            {/* Short on purpose: the frame is small and this sits inside a tall dialog. */}
            {isPast && (
              <p className="notice">Already passed — sounds only if within 2 hours.</p>
            )}
          </div>

          <p className="notice">
            Kept {task.keepCount}× · created {task.createdDate}
          </p>
          <div className="right">
            <button
              className="btn"
              onClick={() => {
                onDelete(task.id)
                onClose()
              }}
            >
              Delete
            </button>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" onClick={save} disabled={!title.trim()}>
              OK
            </button>
          </div>
        </div>
      </Window>
    </div>
  )
}
