import { useRef } from 'react'
import type { Task } from '../types'
import { Window } from './win95/Window'
import { useDialog } from '../hooks/useDialog'

/**
 * A task's notes, read-only and in full.
 *
 * Named for the task side deliberately: this is `Task.notes`, not a notebook `Note`, and
 * nothing here touches `state.notebook` or NoteEditor.
 *
 * Read-only because the row's ✎ is an "let me see it" affordance, not an edit one — editing
 * already lives one click away in Task properties, and `Edit…` hands off to it.
 */

interface Props {
  task: Task
  onEdit: () => void
  onClose: () => void
}

export function TaskNoteDialog({ task, onEdit, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Escape to close, Tab trapped inside, and focus restored to the ✎ that opened it.
  useDialog(ref, onClose)

  return (
    <div
      className="reckoning"
      role="dialog"
      aria-modal="true"
      aria-label={`Notes for ${task.title}`}
      ref={ref}
    >
      <Window title="Notes" chrome={false}>
        <div className="stack">
          <p className="reckoning__title">{task.title}</p>
          {/* A div, not a textarea: nothing here is editable, and a field would imply it was. */}
          <div className="notedlg__body">{task.notes}</div>
          <div className="right">
            <button className="btn" onClick={onEdit}>
              Edit…
            </button>
            <button className="btn" onClick={onClose} autoFocus>
              Close
            </button>
          </div>
        </div>
      </Window>
    </div>
  )
}
