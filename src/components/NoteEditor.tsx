import { useRef, useState } from 'react'
import type { Note } from '../types'
import { Window } from './win95/Window'
import { useDialog } from '../hooks/useDialog'
import { BODY_MAX, TITLE_MAX, isBlank } from '../lib/notes'

interface Props {
  note: Note
  onSave: (id: string, patch: Partial<Note>) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function NoteEditor({ note, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const ref = useRef<HTMLDivElement>(null)

  /**
   * Closing without saving throws away an untouched blank note rather than leaving an
   * "Untitled note" card behind — "New" creates the note immediately so the editor has
   * something real to edit, which would otherwise litter the list on every cancel.
   */
  const discard = () => {
    if (isBlank(note.title, note.body) && isBlank(title, body)) onDelete(note.id)
    onClose()
  }

  useDialog(ref, discard)

  const save = () => {
    if (isBlank(title, body)) {
      discard()
      return
    }
    onSave(note.id, { title: title.trim().slice(0, TITLE_MAX), body: body.slice(0, BODY_MAX) })
    onClose()
  }

  const dirty = title !== note.title || body !== note.body

  return (
    <div className="reckoning" role="dialog" aria-modal="true" aria-label="Note" ref={ref}>
      <Window title="Notepad" chrome={false}>
        <div className="noteeditor">
          <label className="sr-only" htmlFor="ne-title">
            Note title
          </label>
          <input
            id="ne-title"
            className="field noteeditor__title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            autoFocus
          />
          <label className="sr-only" htmlFor="ne-body">
            Note text
          </label>
          <textarea
            id="ne-body"
            className="field noteeditor__body"
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write anything. This never expires and is never reckoned."
          />
          <div className="noteeditor__foot">
            <span className="noteeditor__count">
              {body.length}/{BODY_MAX}
            </span>
            <div className="right">
              <button
                className="btn"
                onClick={() => {
                  onDelete(note.id)
                  onClose()
                }}
                title="Delete this note"
              >
                Delete
              </button>
              <button className="btn" onClick={discard}>
                {dirty ? 'Cancel' : 'Close'}
              </button>
              <button className="btn" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      </Window>
    </div>
  )
}
