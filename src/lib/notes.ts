import type { Note } from '../types'

/**
 * Notebook rules, kept pure and out of React.
 *
 * Notes are the opposite of tasks by design: nothing here shrinks, expires, or shames you.
 * That's the whole point of a separate collection — the reckoning would otherwise force a
 * Keep/Drop decision on a thought that isn't work yet.
 */

export const TITLE_MAX = 80
export const BODY_MAX = 8000

/** Pinned first, then most recently edited. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  )
}

/**
 * A single-line teaser for free text. Newlines collapse to spaces — every caller shows this in
 * a space too narrow for a literal line break, so one would just clip.
 *
 * Takes a string rather than a Note so a task's `notes` field can share it: the hover tooltip
 * on a task row wants exactly this behaviour, and a Task is not a Note.
 */
export function previewText(body: string, max = 60): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max - 1).trimEnd()}…`
}

/** A single-line teaser for the note card. */
export function notePreview(note: Note, max = 60): string {
  return previewText(note.body, max)
}

/** Case-insensitive match across title and body. Blank query matches everything. */
export function matchesQuery(note: Note, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return note.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q)
}

/** An untitled note still needs something to show on its card. */
export function noteLabel(note: Note): string {
  const t = note.title.trim()
  if (t) return t
  const firstLine = note.body.trim().split('\n')[0]?.trim()
  return firstLine ? firstLine.slice(0, TITLE_MAX) : 'Untitled note'
}

/** True when there is nothing worth keeping — used to discard empty notes on close. */
export function isBlank(title: string, body: string): boolean {
  return !title.trim() && !body.trim()
}
