import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types'
import { previewText } from '../lib/notes'
import { ShameBadge, TagBadge } from './win95/Badge'
import { NoteTip } from './NoteTip'

/** Native-tooltip feel. Without it the tip strobes as the pointer sweeps down the list. */
const HOVER_DELAY = 400
/** Roughly two lines in a 250px tooltip. Longer than this is what the ✎ dialog is for. */
const TIP_MAX = 120

interface Props {
  task: Task
  onToggle: (id: string, done: boolean) => void
  onOpen: (id: string) => void
  onOpenNote: (id: string) => void
}

export function TaskRow({ task, onToggle, onOpen, onOpenNote }: Props) {
  const done = task.status === 'completed'
  // Whitespace-only notes are not notes: no badge, nothing to preview.
  const hasNote = task.notes.trim().length > 0

  const noteBtn = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tipAnchor, setTipAnchor] = useState<DOMRect | null>(null)

  const hideTip = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setTipAnchor(null)
  }

  const showTip = () => {
    if (!hasNote || timer.current) return
    timer.current = setTimeout(() => {
      timer.current = null
      // Measured at open time: the list scrolls, so a rect cached earlier would be stale.
      const rect = noteBtn.current?.getBoundingClientRect()
      if (rect) setTipAnchor(rect)
    }, HOVER_DELAY)
  }

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  return (
    <li
      className={done ? 'taskrow taskrow--done' : 'taskrow'}
      onMouseEnter={showTip}
      onMouseLeave={hideTip}
      // React's focus events bubble, so tabbing to either the title or the ✎ arms the tooltip.
      // That is the keyboard equivalent of hover — the retro theme doesn't get to cost a11y.
      onFocus={showTip}
      onBlur={hideTip}
    >
      <input
        type="checkbox"
        className="taskrow__check"
        checked={done}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        aria-label={`Mark "${task.title}" as ${done ? 'not done' : 'done'}`}
      />
      <div className="taskrow__main">
        <button className="taskrow__title" onClick={() => onOpen(task.id)}>
          {task.title}
        </button>
        {(task.keepCount > 0 || task.tags.length > 0 || hasNote || task.remindAt) && (
          <div className="taskrow__meta">
            <ShameBadge keepCount={task.keepCount} />
            {task.remindAt && (
              <span className="badge badge--remind">🔔 {task.remindAt}</span>
            )}
            {task.tags.map((t) => (
              <TagBadge key={t} name={t} />
            ))}
            {hasNote && (
              // A sibling of the title button, not nested inside it, so a click here cannot
              // bubble into "open task properties".
              <button
                ref={noteBtn}
                type="button"
                className="badge taskrow__notebtn"
                onClick={() => onOpenNote(task.id)}
                aria-label={`Show notes for "${task.title}"`}
              >
                ✎
              </button>
            )}
          </div>
        )}
      </div>
      {tipAnchor && <NoteTip text={previewText(task.notes, TIP_MAX)} anchor={tipAnchor} />}
    </li>
  )
}
