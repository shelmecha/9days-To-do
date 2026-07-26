import { useCallback, useEffect, useRef, useState } from 'react'
import { desktopControls } from '../lib/desktop'
import { NoteIcon, TodoIcon } from './win95/CaptureIcons'

type Kind = 'note' | 'todo'

interface Props {
  onAddTask: (title: string) => void
  onAddNote: (body: string) => void
  onExit: () => void
}

/**
 * The floating capture widget: an icon strip at rest, growing to fit a text input when you go to
 * capture something.
 *
 * Both icons are visible while resting, so capturing costs one click. A logo that expanded into a
 * menu would make it two, on every single capture, which is the opposite of the point.
 *
 * The pixel sizes live in exactly two places that must agree: CAPTURE_SIZES in electron/main.cjs
 * (the window) and the .capture block in global.css (the box model). Deliberately not here — this
 * component only names the mode.
 */
export function QuickCapture({ onAddTask, onAddNote, onExit }: Props) {
  /** null = the resting strip; otherwise the kind of thing being typed. */
  const [kind, setKind] = useState<Kind | null>(null)
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState<Kind | null>(null)
  const [status, setStatus] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLButtonElement>(null)
  const todoRef = useRef<HTMLButtonElement>(null)
  const savedTimer = useRef<number | null>(null)

  // Derived, so switching note <-> todo (both 'input') doesn't fire a redundant resize.
  const size = kind ? 'input' : 'idle'
  useEffect(() => {
    desktopControls()?.setCaptureSize(size)
  }, [size])

  useEffect(() => {
    if (kind) inputRef.current?.focus()
  }, [kind])

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  /**
   * Close the input and put focus back on the icon that opened it.
   *
   * Not a nicety: focus would otherwise land on document.body, and in a chrome-less 112px window
   * a keyboard user is then completely stranded — the same failure the dialogs' focus restore
   * exists to prevent.
   */
  const close = useCallback((restoreTo: Kind | null) => {
    setKind(null)
    setValue('')
    const target =
      restoreTo === 'note' ? noteRef.current : restoreTo === 'todo' ? todoRef.current : null
    target?.focus()
  }, [])

  // The icons are toggles: clicking the open one closes it, which is the mouse user's Cancel.
  // Clicking the other switches kind and keeps whatever has been typed.
  const toggle = (next: Kind) => {
    if (kind === next) close(next)
    else setKind(next)
  }

  const save = () => {
    if (!kind) return
    const opened = kind
    const trimmed = value.trim()
    if (!trimmed) {
      close(opened)
      return
    }

    if (opened === 'note') onAddNote(trimmed)
    else onAddTask(trimmed)

    setSaved(opened)
    setStatus(opened === 'note' ? 'Saved note' : 'Saved to-do')
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => {
      setSaved(null)
      setStatus('')
    }, 900)

    close(opened)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      // Closes the input, but deliberately does NOT leave capture mode — an accidental Escape
      // throwing the full 300×500 window onto the screen is worse than requiring the button.
      e.preventDefault()
      close(kind)
    }
  }

  const iconClass = (k: Kind) => `capture__icon${saved === k ? ' capture__icon--saved' : ''}`

  return (
    <div className="capture">
      <h1 className="sr-only">Quick capture</h1>
      {/* Mounted permanently and empty. A live region that appears already containing its text
          is routinely missed by screen readers. */}
      <span className="sr-only" role="status">
        {status}
      </span>

      {kind && (
        <input
          ref={inputRef}
          type="text"
          className="field"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          aria-label={kind === 'note' ? 'Note text' : 'To-do title'}
          placeholder={kind === 'note' ? 'Note…' : 'To-do…'}
        />
      )}

      <div className="capture__strip">
        <span className="capture__grip" aria-hidden="true" />

        <button
          ref={noteRef}
          className={iconClass('note')}
          onClick={() => toggle('note')}
          aria-pressed={kind === 'note'}
          aria-label="Add note"
          title="Add note"
        >
          <NoteIcon />
        </button>

        <button
          ref={todoRef}
          className={iconClass('todo')}
          onClick={() => toggle('todo')}
          aria-pressed={kind === 'todo'}
          aria-label="Add to-do"
          title="Add to-do"
        >
          <TodoIcon />
        </button>

        <button
          className="capture__icon capture__icon--restore"
          onClick={onExit}
          aria-label="Restore full window"
          title="Restore full window"
        >
          □
        </button>
      </div>
    </div>
  )
}
