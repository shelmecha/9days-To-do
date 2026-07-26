import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, Note, Task } from '../types'
import { loadState, saveState, purge } from '../lib/storage'
import { localDateString, isNewDay, addDays } from '../lib/dates'
import { reckoningQueue } from '../lib/reckoning'

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useStore() {
  const today = localDateString(new Date())

  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState()
    // A first-ever visitor gets today stamped, so their first reckoning is tomorrow's.
    const seeded = loaded.lastReckoningDate ?? today
    return purge({ ...loaded, lastReckoningDate: seeded }, today)
  })

  useEffect(() => {
    saveState(state)
  }, [state])

  const reckoningDue = isNewDay(state.lastReckoningDate, new Date())
  const queue = useMemo(
    () => (reckoningDue ? reckoningQueue(state.tasks, today) : []),
    [reckoningDue, state.tasks, today],
  )

  const addTask = useCallback(
    (title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      const task: Task = {
        id: newId(),
        title: trimmed.slice(0, 200),
        notes: '',
        tags: [],
        status: 'active',
        keepCount: 0,
        createdDate: localDateString(new Date()),
        createdAt: new Date().toISOString(),
      }
      setState((s) => ({ ...s, tasks: [task, ...s.tasks] }))
    },
    [],
  )

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }, [])

  const setCompleted = useCallback((id: string, done: boolean) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id
          ? done
            ? { ...t, status: 'completed', completedAt: new Date().toISOString() }
            : { ...t, status: 'active', completedAt: undefined }
          : t,
      ),
    }))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
  }, [])

  /** Empty the Done list by hand, instead of waiting for the 30-day purge. */
  const clearCompleted = useCallback(() => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.status !== 'completed') }))
  }, [])

  /** Reckoning decisions persist one at a time, so a mid-reckoning refresh resumes. */
  const keep = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, keepCount: t.keepCount + 1 } : t)),
    }))
  }, [])

  const drop = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: 'dropped', droppedAt: new Date().toISOString() } : t,
      ),
    }))
  }, [])

  /** Stamped only once the queue is empty — this is what stops a re-fire on the next load. */
  const finishReckoning = useCallback(() => {
    setState((s) => ({ ...s, lastReckoningDate: localDateString(new Date()) }))
  }, [])

  /**
   * Rewind the stamp so the reckoning fires on the next render.
   *
   * No longer wired to a button — the "Next day" menu item was removed, because the app is
   * about finishing today and a control labelled "tomorrow" argued against that. Kept because
   * it is the only way to exercise the reckoning without waiting overnight: call it from the
   * console (or re-add a button) when demoing.
   */
  const simulateTomorrow = useCallback(() => {
    setState((s) => ({
      ...s,
      lastReckoningDate: addDays(s.lastReckoningDate ?? localDateString(new Date()), -1),
    }))
  }, [])

  const resetAll = useCallback(() => {
    setState({ tasks: [], notebook: [], lastReckoningDate: localDateString(new Date()) })
  }, [])

  /* ---------- Notebook ----------
     Notes are intentionally untouched by the reckoning and the purge. Nothing here expires. */

  /** Creates an empty note and returns its id so the caller can open it for editing. */
  const addNote = useCallback((): string => {
    const now = new Date().toISOString()
    const note: Note = {
      id: newId(),
      title: '',
      body: '',
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    setState((s) => ({ ...s, notebook: [note, ...s.notebook] }))
    return note.id
  }, [])

  /** Creates a note with a body immediately (used by quick capture). */
  const quickAddNote = useCallback((body: string) => {
    const trimmed = body.trim()
    if (!trimmed) return
    const now = new Date().toISOString()
    const note: Note = {
      id: newId(),
      title: '',
      body: trimmed,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    setState((s) => ({ ...s, notebook: [note, ...s.notebook] }))
  }, [])

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setState((s) => ({
      ...s,
      notebook: s.notebook.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
      ),
    }))
  }, [])

  const deleteNote = useCallback((id: string) => {
    setState((s) => ({ ...s, notebook: s.notebook.filter((n) => n.id !== id) }))
  }, [])

  const togglePin = useCallback((id: string) => {
    // Pinning is not an edit, so it must not bump updatedAt — that would reshuffle the list
    // out from under the user every time they pinned something.
    setState((s) => ({
      ...s,
      notebook: s.notebook.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    }))
  }, [])

  /** Mark a reminder as having sounded today, so it doesn't repeat. */
  const markReminded = useCallback((id: string) => {
    const stamp = localDateString(new Date())
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, remindedDate: stamp } : t)),
    }))
  }, [])

  return {
    state,
    today,
    reckoningDue,
    queue,
    addTask,
    updateTask,
    setCompleted,
    deleteTask,
    clearCompleted,
    keep,
    drop,
    finishReckoning,
    simulateTomorrow,
    resetAll,
    markReminded,
    addNote,
    quickAddNote,
    updateNote,
    deleteNote,
    togglePin,
  }
}
