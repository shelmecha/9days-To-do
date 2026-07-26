import { useMemo, useState } from 'react'
import type { Note } from '../types'
import { matchesQuery, noteLabel, notePreview, sortNotes } from '../lib/notes'

interface Props {
  notes: Note[]
  onAdd: () => void
  onOpen: (id: string) => void
  onTogglePin: (id: string) => void
}

/** "2026-07-26T…" -> "26 Jul". Short on purpose; the card is one 300px-wide line. */
function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function NotesView({ notes, onAdd, onOpen, onTogglePin }: Props) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => sortNotes(notes), [notes])
  const shown = useMemo(() => sorted.filter((n) => matchesQuery(n, query)), [sorted, query])

  return (
    <>
      <div className="quickadd">
        <label className="sr-only" htmlFor="note-search">
          Search notes
        </label>
        <input
          id="note-search"
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
          // Only useful once there's something to search through.
          disabled={notes.length === 0}
        />
        <button className="btn btn--sm" type="button" onClick={onAdd}>
          New
        </button>
      </div>

      <ul className="notelist">
        {shown.length === 0 ? (
          <li className="empty">
            {notes.length === 0 ? (
              <>
                Nothing written down yet.
                <br />
                Notes never expire — the Reckoning leaves them alone.
              </>
            ) : (
              'No notes match that search.'
            )}
          </li>
        ) : (
          shown.map((n) => (
            <li key={n.id} className={n.pinned ? 'notecard notecard--pinned' : 'notecard'}>
              <button className="notecard__open" onClick={() => onOpen(n.id)}>
                <span className="notecard__title">{noteLabel(n)}</span>
                {notePreview(n) && <span className="notecard__preview">{notePreview(n)}</span>}
                <span className="notecard__date">{shortDate(n.updatedAt)}</span>
              </button>
              <button
                className="notecard__pin"
                onClick={() => onTogglePin(n.id)}
                aria-pressed={n.pinned}
                aria-label={n.pinned ? `Unpin "${noteLabel(n)}"` : `Pin "${noteLabel(n)}"`}
                title={n.pinned ? 'Unpin' : 'Pin to top'}
              >
                📌
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="statusbar">
        <span>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          {query.trim() ? ` · ${shown.length} shown` : ''}
        </span>
        <span>Never reckoned</span>
      </div>
    </>
  )
}
