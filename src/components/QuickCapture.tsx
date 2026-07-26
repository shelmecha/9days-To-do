import { useEffect, useRef, useState } from 'react'
import { desktopControls } from '../lib/desktop'

interface Props {
  onAddTask: (title: string) => void
  onAddNote: (body: string) => void
  onExit: () => void
}

export function QuickCapture({ onAddTask, onAddNote, onExit }: Props) {
  const [mode, setMode] = useState<'idle' | 'note' | 'todo' | 'saved'>('idle')
  const [value, setValue] = useState('')
  const [savedKind, setSavedKind] = useState<'note' | 'todo' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    desktopControls()?.setCaptureSize(mode === 'idle' ? 'idle' : 'input')
  }, [mode])

  useEffect(() => {
    if (mode === 'note' || mode === 'todo') {
      inputRef.current?.focus()
    }
  }, [mode])

  const handleSave = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setMode('idle')
      setValue('')
      return
    }
    if (mode === 'note') {
      onAddNote(trimmed)
    } else if (mode === 'todo') {
      onAddTask(trimmed)
    }
    setValue('')
    setSavedKind(mode === 'note' ? 'note' : 'todo')
    setMode('saved')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      setMode('idle')
      setSavedKind(null)
    }, 900)
  }

  const handleCancel = () => {
    setMode('idle')
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className="capture">
      <div className="capture__bar">
        <span className="sr-only">Quick capture</span>
        <button
          className="titlebar__btn"
          onClick={onExit}
          aria-label="Restore full window"
          title="Restore full window"
        >
          □
        </button>
      </div>

      <div className="capture__body">
        {mode === 'idle' && (
          <div className="capture__actions">
            <button className="btn" onClick={() => setMode('note')}>
              Add Note
            </button>
            <button className="btn" onClick={() => setMode('todo')}>
              Add To-Do
            </button>
          </div>
        )}

        {(mode === 'note' || mode === 'todo') && (
          <div className="capture__input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="field"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
              placeholder={mode === 'note' ? 'Note content' : 'Task title'}
            />
            <div className="capture__input-buttons">
              <button className="btn" onClick={handleSave} disabled={!value.trim()}>
                Save
              </button>
              <button className="btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === 'saved' && (
          <div role="status" className="capture__saved">
            Saved {savedKind === 'note' ? 'note' : 'to-do'}
          </div>
        )}
      </div>
    </div>
  )
}
