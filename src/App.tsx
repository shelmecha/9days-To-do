import { useMemo, useState } from 'react'
import type { View } from './types'
import { useStore } from './hooks/useStore'
import { useReminders } from './hooks/useReminders'
import { primeAudio } from './lib/chime'
import { Window } from './components/win95/Window'
import { TaskRow } from './components/TaskRow'
import { TaskDetail } from './components/TaskDetail'
import { ArchiveView } from './components/ArchiveView'
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

  // Reminders stay silent during a reckoning — one blocking thing at a time.
  const reminders = useReminders(
    store.state.tasks,
    store.today,
    store.markReminded,
    !store.reckoningDue,
  )

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

  return (
    // Any click unlocks audio, so a reminder later in the session can actually sound.
    <div className="app" onPointerDown={primeAudio}>
      <Window
        title="9days To-do"
        toolbar={
          <div className="menubar">
            <button aria-current={view === 'list'} onClick={() => setView('list')}>
              Today
            </button>
            <button aria-current={view === 'notes'} onClick={() => setView('notes')}>
              Notes
            </button>
            <button aria-current={view === 'archive'} onClick={() => setView('archive')}>
              Archive
            </button>
            <button onClick={store.simulateTomorrow} title="Demo: trigger the Reckoning now">
              Next day
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
        ) : view === 'archive' ? (
          <ArchiveView
            tasks={store.state.tasks}
            today={store.today}
            onRestore={(id) => store.setCompleted(id, false)}
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
                  {active.length === 0
                    ? 'Nothing on the list. Add something above.'
                    : 'No tasks with that tag.'}
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

            <div className="statusbar">
              <span>
                {active.length} active{tagFilter ? ` · filtered by "${tagFilter}"` : ''}
              </span>
              <span>
                Last reckoning: {store.state.lastReckoningDate ?? 'never'}
              </span>
            </div>

            {/* Kept to one line on purpose: the window height is fixed, so long copy
                pushes the list out of view. */}
            <p className="notice">Tomorrow: keep or drop whatever is still here.</p>
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
