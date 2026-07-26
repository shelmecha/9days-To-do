import { useEffect, useMemo, useState } from 'react'
import type { View } from './types'
import { useStore } from './hooks/useStore'
import { useReminders } from './hooks/useReminders'
import { primeAudio } from './lib/chime'
import { desktopControls } from './lib/desktop'
import { Window } from './components/win95/Window'
import { QuickCapture } from './components/QuickCapture'
import { TaskRow } from './components/TaskRow'
import { TaskDetail } from './components/TaskDetail'
import { DoneView } from './components/DoneView'
import { NotesView } from './components/NotesView'
import { NoteEditor } from './components/NoteEditor'
import { ReckoningOverlay } from './components/ReckoningOverlay'
import { ReminderDialog } from './components/ReminderDialog'

export default function App() {
  const store = useStore()
  const [view, setView] = useState<View>('list')
  const [draft, setDraft] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [captureMode, setCaptureMode] = useState(false)

  // Reminders stay silent during a reckoning or capture mode — one blocking thing at a time.
  const reminders = useReminders(
    store.state.tasks,
    store.today,
    store.markReminded,
    !store.reckoningDue && !captureMode,
  )

  // Reckoning takes precedence over capture mode
  useEffect(() => {
    if (store.reckoningDue && captureMode) {
      desktopControls()?.exitCapture()
      setCaptureMode(false)
    }
  }, [store.reckoningDue, captureMode])

  const active = useMemo(
    () =>
      store.state.tasks
        .filter((t) => t.status === 'active')
        // Most-avoided first: the tasks you keep dodging float to the top.
        .sort((a, b) => b.keepCount - a.keepCount || a.createdAt.localeCompare(b.createdAt)),
    [store.state.tasks],
  )

  const allTags = useMemo(
    () => Array.from(new Set(active.flatMap((t) => t.tags))).sort(),
    [active],
  )

  const visible = tagFilter ? active.filter((t) => t.tags.includes(tagFilter)) : active
  const openTask = store.state.tasks.find((t) => t.id === openId) ?? null
  const openNote = store.state.notebook.find((n) => n.id === openNoteId) ?? null

  // The reckoning blocks everything else. Rendered before any list markup exists.
  if (store.reckoningDue) {
    return (
      <div className="app">
        <ReckoningOverlay
          queue={store.queue}
          onKeep={store.keep}
          onDrop={store.drop}
          onFinish={store.finishReckoning}
        />
      </div>
    )
  }

  if (captureMode) {
    return (
      <QuickCapture
        onAddTask={store.addTask}
        onAddNote={store.quickAddNote}
        onExit={() => {
          desktopControls()?.exitCapture()
          setCaptureMode(false)
        }}
      />
    )
  }

  return (
    // Any click unlocks audio, so a reminder later in the session can actually sound.
    <div className="app" onPointerDown={primeAudio}>
      <Window
        title="9days To-do"
        onEnterCapture={() => {
          const controls = desktopControls()
          if (!controls) return
          controls.enterCapture().then(() => setCaptureMode(true))
        }}
        toolbar={
          <div className="menubar">
            <button aria-current={view === 'list'} onClick={() => setView('list')}>
              Today
            </button>
            <button aria-current={view === 'notes'} onClick={() => setView('notes')}>
              Notes
            </button>
            <button aria-current={view === 'done'} onClick={() => setView('done')}>
              Done
            </button>
          </div>
        }
      >
        {view === 'notes' ? (
          <NotesView
            notes={store.state.notebook}
            onAdd={() => setOpenNoteId(store.addNote())}
            onOpen={setOpenNoteId}
            onTogglePin={store.togglePin}
          />
        ) : view === 'done' ? (
          <DoneView
            tasks={store.state.tasks}
            today={store.today}
            onRestore={(id) => store.setCompleted(id, false)}
            onClearAll={store.clearCompleted}
          />
        ) : (
          <>
            <form
              className="quickadd"
              onSubmit={(e) => {
                e.preventDefault()
                store.addTask(draft)
                setDraft('')
              }}
            >
              <label className="sr-only" htmlFor="qa">
                New task
              </label>
              <input
                id="qa"
                className="field"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What needs doing?"
                maxLength={200}
                autoFocus
              />
              <button className="btn" type="submit" disabled={!draft.trim()}>
                Add
              </button>
            </form>

            {allTags.length > 0 && (
              <div className="tagfilter">
                <button
                  className="btn"
                  aria-pressed={tagFilter === null}
                  onClick={() => setTagFilter(null)}
                >
                  All
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    className="btn"
                    aria-pressed={tagFilter === t}
                    onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <ul className="tasklist">
              {visible.length === 0 ? (
                <li className="empty">
                  {active.length === 0 ? "Empty. That's the goal." : 'Nothing with that tag.'}
                </li>
              ) : (
                visible.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={store.setCompleted}
                    onOpen={setOpenId}
                  />
                ))
              )}
            </ul>

            {/* One status bar carries both the count and the pitch. The window is small and
                fixed-height, so a second line of copy would push the list out of view — the
                separate footer notice that used to live here was folded into the right slot. */}
            <div className="statusbar">
              <span>
                {active.length} active{tagFilter ? ` · ${tagFilter}` : ''}
              </span>
              <span>keep or drop tomorrow</span>
            </div>
          </>
        )}
      </Window>

      {openTask && (
        <TaskDetail
          task={openTask}
          onSave={store.updateTask}
          onDelete={store.deleteTask}
          onClose={() => setOpenId(null)}
        />
      )}

      {openNote && (
        <NoteEditor
          note={openNote}
          onSave={store.updateNote}
          onDelete={store.deleteNote}
          onClose={() => setOpenNoteId(null)}
        />
      )}

      {reminders.firing && (
        <ReminderDialog
          task={reminders.firing}
          onDone={(id) => store.setCompleted(id, true)}
          onDismiss={reminders.dismiss}
        />
      )}
    </div>
  )
}
