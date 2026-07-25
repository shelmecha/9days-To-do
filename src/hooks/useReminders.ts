import { useEffect, useState } from 'react'
import type { Task } from '../types'
import { dueReminders } from '../lib/reminders'
import { playChime } from '../lib/chime'

const TICK_MS = 15_000

/**
 * Polls the wall clock and surfaces one due reminder at a time.
 *
 * Polling rather than setTimeout on purpose: a timer scheduled hours ahead drifts, and is
 * unreliable when the machine sleeps. Re-checking the clock is immune to both.
 */
export function useReminders(
  tasks: Task[],
  today: string,
  onFired: (id: string) => void,
  enabled: boolean,
) {
  const [firing, setFiring] = useState<Task | null>(null)

  useEffect(() => {
    if (!enabled) return

    const check = () => {
      // Don't stack dialogs — wait for the current one to be dismissed.
      if (firing) return
      const due = dueReminders(tasks, new Date(), today)[0]
      if (!due) return
      setFiring(due)
      onFired(due.id) // stamp immediately so a re-render can't double-fire it
      playChime()
    }

    check()
    const id = window.setInterval(check, TICK_MS)
    return () => window.clearInterval(id)
  }, [tasks, today, onFired, firing, enabled])

  return { firing, dismiss: () => setFiring(null) }
}
