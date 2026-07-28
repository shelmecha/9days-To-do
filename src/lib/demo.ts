import type { AppState } from '../types'
import { addDays } from './dates'

/**
 * The public demo's seed data.
 *
 * The app exists to show that backlogs must shrink, and the Reckoning is how it says so — but a
 * first-time visitor never sees one. `useStore` stamps today's date for anyone with no history,
 * so their first reckoning would be *tomorrow's*. A stranger opening the demo would find an
 * ordinary to-do list and leave none the wiser.
 *
 * So the demo seeds a backlog that is already overdue: tasks created days ago and a
 * `lastReckoningDate` of yesterday, which makes `isNewDay` true and drops the visitor straight
 * into the gauntlet. The keepCounts are chosen to walk the whole shame ladder on the way down.
 *
 * None of this touches the real app: the seed only applies on the /demo path, so the Electron
 * shell (which loads dist/index.html) and `npm run dev` at / can never trigger it.
 */

/** Set once per tab session, so a refresh mid-play resumes instead of wiping the visitor's work. */
const SESSION_KEY = '9days-todo/demo-seeded'

/** The demo lives at /demo. Everything else — including file:// in the exe — is the real app. */
export function isDemoPath(pathname: string): boolean {
  return pathname === '/demo' || pathname.startsWith('/demo/')
}

/**
 * Read-only, so it is safe inside a useState initializer — StrictMode invokes those twice, and a
 * check that also wrote the session flag would seed on the first call and refuse on the second.
 * Marking is `markDemoSeeded`, called from an effect.
 */
export function shouldSeedDemo(): boolean {
  if (typeof window === 'undefined') return false
  if (!isDemoPath(window.location.pathname)) return false
  try {
    return sessionStorage.getItem(SESSION_KEY) === null
  } catch {
    // Private mode with storage disabled: reseed every load rather than break the demo.
    return true
  }
}

export function markDemoSeeded(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Nothing useful to do; worst case the demo reseeds on refresh.
  }
}

/**
 * Pure so it can be tested without a browser. `today` comes from the caller rather than the
 * clock for the same reason every date in this app does.
 */
export function demoState(today: string): AppState {
  const ago = (n: number) => addDays(today, -n)
  const at = (n: number, hh: string) => `${ago(n)}T${hh}:00.000Z`

  return {
    // Ordered oldest-first; the Today list re-sorts by keepCount anyway.
    tasks: [
      {
        id: 'demo-typography',
        title: 'Read that article on typography',
        notes: '',
        tags: ['someday'],
        status: 'active',
        // 9 keeps = the loudest tier, and the reckoning switches to its blunter prompt at 6.
        keepCount: 9,
        createdDate: ago(12),
        createdAt: at(12, '20:10'),
      },
      {
        id: 'demo-dana',
        title: 'Reply to Dana about the invoice',
        notes:
          'She needs the PO number and the revised total.\n\nRef BX-4471 — they always ask for it twice.',
        tags: ['work'],
        keepCount: 4,
        status: 'active',
        createdDate: ago(6),
        createdAt: at(6, '09:30'),
      },
      {
        id: 'demo-domain',
        title: 'Renew the domain before it lapses',
        // A second note-bearing task, so the ✎ is still discoverable on the list however the
        // visitor resolves the reckoning above.
        notes: 'Expires the 14th. Card on file is the old one — update it first.',
        tags: ['admin'],
        status: 'active',
        keepCount: 1,
        createdDate: ago(3),
        createdAt: at(3, '11:00'),
        // Shows the reminder badge without ambushing a visitor with a chime: stamping
        // remindedDate as today means isReminderDue has already had its one shot.
        remindAt: '09:00',
        remindedDate: today,
      },
      {
        id: 'demo-dentist',
        title: 'Book the dentist',
        notes: '',
        tags: [],
        status: 'active',
        keepCount: 0,
        createdDate: ago(1),
        createdAt: at(1, '17:45'),
      },
      // Completed tasks are exempt from the queue, so these only populate the Done screen.
      {
        id: 'demo-done-font',
        title: 'Ship the pixel-font fix',
        notes: '',
        tags: ['work'],
        status: 'completed',
        keepCount: 2,
        createdDate: ago(4),
        createdAt: at(4, '10:00'),
        completedAt: at(1, '16:20'),
      },
      {
        id: 'demo-done-bill',
        title: 'Pay the electricity bill',
        notes: '',
        tags: ['admin'],
        status: 'completed',
        keepCount: 0,
        createdDate: ago(2),
        createdAt: at(2, '08:15'),
        completedAt: at(1, '08:40'),
      },
    ],
    notebook: [
      {
        id: 'demo-note-why',
        title: 'Why this app is rude to you',
        body: 'Every other to-do app lets a task sit there for a year.\n\nThis one makes you say, out loud, that you still want it. Nothing carries over silently.',
        pinned: true,
        createdAt: at(12, '20:15'),
        updatedAt: at(3, '12:00'),
      },
      {
        id: 'demo-note-ideas',
        title: '',
        body: 'Notes are not tasks. Nothing here expires, shrinks, or asks anything of you — that is the whole reason they live somewhere else.',
        pinned: false,
        createdAt: at(5, '14:00'),
        updatedAt: at(5, '14:00'),
      },
    ],
    // Yesterday, so isNewDay() is true and the reckoning fires on the very first render.
    lastReckoningDate: ago(1),
  }
}
