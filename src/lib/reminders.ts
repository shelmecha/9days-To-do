import type { Task } from '../types'

/**
 * Reminders are a clock time for *today* ("HH:MM"), not a full datetime — the app is a
 * daily-focus tool, so a reminder that survives past today would contradict the reckoning.
 *
 * A reminder can only fire while the app is running. Nothing here can wake a closed app;
 * the Electron tray is what keeps it alive in practice.
 */

/** How late a reminder may still fire, in minutes. */
export const GRACE_MINUTES = 120

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTime(hhmm: string): boolean {
  return TIME_RE.test(hhmm)
}

/** "HH:MM" -> minutes since local midnight. Returns null for malformed input. */
export function minutesOfDay(hhmm: string): number | null {
  const m = TIME_RE.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function currentTimeString(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * Should this task's reminder sound right now?
 *
 * Fires at most once per calendar day (`remindedDate`), only for active tasks, and only
 * within the grace window — so reopening the app in the evening doesn't dump a pile of
 * stale morning alarms on you.
 */
export function isReminderDue(task: Task, now: Date, today: string): boolean {
  if (task.status !== 'active') return false
  if (!task.remindAt) return false
  if (task.remindedDate === today) return false

  const due = minutesOfDay(task.remindAt)
  if (due === null) return false

  const nowMins = minutesOfDay(currentTimeString(now))
  if (nowMins === null) return false

  const late = nowMins - due
  return late >= 0 && late <= GRACE_MINUTES
}

/** Active tasks whose reminders are due, earliest scheduled first. */
export function dueReminders(tasks: Task[], now: Date, today: string): Task[] {
  return tasks
    .filter((t) => isReminderDue(t, now, today))
    .sort((a, b) => (minutesOfDay(a.remindAt!) ?? 0) - (minutesOfDay(b.remindAt!) ?? 0))
}
