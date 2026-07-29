import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// package.json sets "type": "module", so there is no __dirname here — referencing it throws at
// import time and Playwright reports "No tests found", which reads as a missing file rather than
// a broken one.
const here = dirname(fileURLToPath(import.meta.url))

/**
 * Portfolio demo reel. Not a smoke test — `app.spec.ts` is the smoke test and stays as it is.
 *
 * This walks a full day of the product, in the order that explains it without narration:
 *
 *   1. The problem, shown rather than claimed — a Today list already carrying three tasks that
 *      have been dodged 3, 6 and 9 times, each wearing a different rung of the shame ladder.
 *   2. Capture — three new tasks typed into quick-add.
 *   3. Finish one — the count goes down, which is the only direction it should go.
 *   4. Sharpen one — note, tag and a reminder that is deliberately set just far enough in the
 *      past to fire on save, so the reel actually shows a reminder going off.
 *   5. The notebook — a place for thoughts that aren't work yet, which the Reckoning never touches.
 *   6. Done — the finished task, with its purge countdown.
 *   7. The Reckoning — the clock rolls over and every leftover must be Kept or Dropped before
 *      the list is reachable. The nine-times-dodged task closes the review and gets dropped.
 *   8. Relief — six became three, and the one that was kept wears a *higher* number than before.
 *
 * Every act boundary is stamped into `portfolio-assets/9days-demo-landmarks.json`, in seconds
 * from the start of the recording. The Remotion reel reads that file instead of hardcoding
 * timings measured off a contact sheet, so re-recording does not invalidate the edit.
 *
 * All data is invented. Nothing here touches application code.
 */

const STORAGE_KEY = '9days-todo/v1'

const VIDEO_OUT = resolve(here, '../portfolio-assets/9days-raw-demo.webm')
const MARKS_OUT = resolve(here, '../portfolio-assets/9days-demo-landmarks.json')

/** Long enough for a viewer to read the change, short enough to keep the reel watchable. */
const BEAT = 900
/** A held final frame, so the closing state isn't clipped by the encoder. */
const FINAL_HOLD = 2600

/** Local calendar date, matching `localDateString` — never UTC. */
function localDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * A reminder time five minutes in the past.
 *
 * `isReminderDue` fires when the current time is 0–120 minutes past the stamp, and `useReminders`
 * re-checks on every change to `tasks` — so saving this from the properties dialog rings the
 * reminder immediately instead of after the 15s poll. Clamped at midnight so the small hours
 * can't produce a negative time.
 */
function justPassedTime(): string {
  const now = new Date()
  const mins = Math.max(0, now.getHours() * 60 + now.getMinutes() - 5)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
}

/**
 * Three tasks that have been carried, each landing on a different rung of `shameTier`:
 * 3 = warn, 6 = bad, 9 = worst (which adds the ⛔ and the harder Reckoning prompt).
 *
 * Order matters. `reckoningQueue` preserves array order and `addTask` prepends, so the seeds
 * are reviewed last — which is what puts the nine-times-dodged one at the end of the queue,
 * where the reel needs its climax.
 */
const CARRIED = [
  { id: 'demo-carried-6', title: 'Chase the insurance renewal', keepCount: 6, tags: ['admin'] },
  { id: 'demo-carried-3', title: 'Read that productivity book', keepCount: 3, tags: [] },
  { id: 'demo-carried-9', title: 'Rewrite the pitch deck', keepCount: 9, tags: ['work'] },
] as const

const AVOIDED = CARRIED[2].title

/** Captured live. `addTask` prepends, so the reckoning meets these first. */
const CAPTURED = [
  'Email Mara the venue quote',
  'Fix the broken footer link',
  'Book the studio for Thursday',
] as const

const SHARPENED = CAPTURED[0]
const FINISHED = CAPTURED[1]
const TASK_NOTE = 'Quote expires Friday — chase it.'

const NOTE_TITLE = 'Studio ideas'
const NOTE_BODY = 'Warm lighting, one long table, no stage. Ask about the courtyard.'

/**
 * Landmark recorder.
 *
 * Times are seconds since the first line of the test body, which is a few milliseconds after
 * Playwright starts the recording — close enough that the reel's single calibration constant
 * absorbs the difference. Marking is cheap, so mark generously: an unused landmark costs
 * nothing, a missing one costs a re-record.
 */
class Marks {
  private readonly t0 = Date.now()
  private readonly marks: { name: string; t: number }[] = []

  at(name: string): void {
    this.marks.push({ name, t: Number(((Date.now() - this.t0) / 1000).toFixed(3)) })
  }

  write(path: string): void {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(
      path,
      `${JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          durationSec: Number(((Date.now() - this.t0) / 1000).toFixed(3)),
          marks: this.marks,
        },
        null,
        2,
      )}\n`,
    )
  }
}

/**
 * A task's title button on the list.
 *
 * `exact` is required, not tidiness: once a task has notes its ✎ chip carries the aria-label
 * `Show notes for "<title>"`, so a substring name match resolves to two buttons.
 */
function taskTitle(page: Page, title: string) {
  return page.getByRole('button', { name: title, exact: true })
}

/**
 * Menu items, scoped to the menu bar.
 *
 * Same trap as `taskTitle` above, from the other direction: Playwright's `name` match is a
 * case-insensitive SUBSTRING by default, and a task with notes carries the aria-label
 * `Show notes for "<title>"` — which contains "notes". An unscoped { name: 'Notes' } therefore
 * resolves to both the menu item and every ✎ chip on the list, and fails on strict mode.
 */
function menu(page: Page, name: 'Today' | 'Notes' | 'Done') {
  return page.locator('.menubar').getByRole('button', { name, exact: true })
}

async function beat(page: Page, ms = BEAT) {
  await page.waitForTimeout(ms)
}

test.describe('portfolio demo', () => {
  // A six-act walkthrough with a five-card reckoning doesn't fit the default 30s budget.
  test.setTimeout(180_000)

  test('a full day: carry, capture, remind, reckon', async ({ page }) => {
    const marks = new Marks()
    const video = page.video()
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))

    /*
     * A lived-in start: three tasks already carried, so the shame ladder has all three of its
     * upper rungs visible at once, and `lastReckoningDate` = today so we open on the list rather
     * than mid-reckoning. Guarded on the key being absent, because this init script re-runs on
     * the one reload later and must not clobber the state the demo has built.
     */
    await page.addInitScript(
      ({ key, tasks, today }) => {
        if (localStorage.getItem(key)) return
        localStorage.setItem(
          key,
          JSON.stringify({
            tasks: tasks.map((t, i) => ({
              ...t,
              notes: '',
              status: 'active',
              // Staggered so the "created" line in properties reads as a real history.
              createdDate: t.createdDate,
              createdAt: `${t.createdDate}T0${8 + i}:12:00.000Z`,
            })),
            notebook: [],
            lastReckoningDate: today,
          }),
        )
      },
      {
        key: STORAGE_KEY,
        today: localDate(0),
        tasks: CARRIED.map((t) => ({
          id: t.id,
          title: t.title,
          tags: [...t.tags],
          keepCount: t.keepCount,
          createdDate: localDate(-t.keepCount),
        })),
      },
    )

    await page.goto('/app.html')

    // ---- Act 1: the problem, already on screen ----
    await expect(page.locator('.titlebar')).toContainText('9days To-do')
    await expect(page.locator('.taskrow')).toHaveCount(3)
    marks.at('app-visible')

    // Most-avoided first, so the ladder reads top to bottom: worst, bad, warn.
    // Located by class, not text: the worst tier prefixes a ⛔ span, so the badge's text
    // content is not exactly the label.
    await expect(page.locator('.badge--worst')).toContainText('Kept 9× — be honest')
    await expect(page.locator('.badge--bad')).toContainText('Kept 6×')
    await expect(page.locator('.badge--warn')).toContainText('Kept 3×')
    await expect(page.locator('.statusbar')).toContainText('3 active')
    marks.at('backlog-shown')
    await beat(page, 2200)

    // ---- Act 2: capture ----
    const quickAdd = page.getByPlaceholder('What needs doing?')
    const addButton = page.getByRole('button', { name: 'Add', exact: true })
    marks.at('capture-start')

    for (const title of CAPTURED) {
      await quickAdd.pressSequentially(title, { delay: 30 })
      await addButton.click()
      await expect(taskTitle(page, title)).toBeVisible()
      await beat(page)
    }

    await expect(page.locator('.statusbar')).toContainText('6 active')
    marks.at('capture-end')
    await beat(page)

    // ---- Act 3: finish one. The count goes down ----
    // `.click()`, not `.check()`: ticking a task moves it to Done and unmounts the row, so
    // check()'s "is it checked now?" assertion has nothing left to read and retries forever.
    await page.getByRole('checkbox', { name: `Mark "${FINISHED}" as done` }).click()
    await expect(taskTitle(page, FINISHED)).toBeHidden()
    await expect(page.locator('.statusbar')).toContainText('5 active')
    marks.at('task-completed')
    await beat(page, 1400)

    // ---- Act 4: sharpen one — note, tag, reminder ----
    const remindAt = justPassedTime()
    await taskTitle(page, SHARPENED).click()
    const props = page.getByRole('dialog', { name: 'Task properties' })
    await expect(props).toBeVisible()
    marks.at('props-open')
    await beat(page)

    await props.locator('#td-notes').pressSequentially(TASK_NOTE, { delay: 22 })
    await props.locator('#td-tags').pressSequentially('venue', { delay: 40 })
    await props.locator('#td-remind').fill(remindAt)
    // The grace-window notice, which is the app explaining its own rule on camera.
    await expect(props.getByText('Already passed')).toBeVisible()
    marks.at('props-filled')
    await beat(page, 1400)

    await props.getByRole('button', { name: 'OK' }).click()

    // ---- Act 5: the reminder goes off ----
    // `useReminders` re-checks on every change to `tasks`, so saving a time that has just passed
    // rings it on the same tick rather than at the next 15s poll.
    // Named by the TASK TITLE, not "Reminder". ReminderDialog uses aria-labelledby="rem-heading",
    // and that heading is the task title — "Reminder" is only the Window's chrome caption, which
    // is presentational. A { name: 'Reminder' } lookup can never match.
    const reminder = page.getByRole('dialog', { name: SHARPENED })
    await expect(reminder).toBeVisible()
    await expect(reminder.getByText(`Scheduled for ${remindAt}. It's time.`)).toBeVisible()
    await expect(reminder.getByText(TASK_NOTE)).toBeVisible()
    marks.at('reminder-fired')
    await beat(page, 2200)

    await reminder.getByRole('button', { name: 'Snooze' }).click()
    await expect(reminder).toBeHidden()
    marks.at('reminder-dismissed')

    // The row now carries the reminder bell, the tag and the ✎ note chip.
    const sharpened = page.locator('.taskrow', { hasText: SHARPENED })
    await expect(sharpened.locator('.badge--remind')).toContainText(remindAt)
    // By class: the task's own title also contains the word "venue".
    await expect(sharpened.locator('.badge--tag')).toHaveText('venue')
    marks.at('chips-shown')
    await beat(page)

    // Hovering the row previews the note without opening anything. `HOVER_DELAY` is 400ms.
    await sharpened.hover()
    await expect(page.locator('.notetip')).toContainText(TASK_NOTE)
    marks.at('notetip-shown')
    await beat(page, 1600)
    // Park the pointer off the list, or the tip stays up through the next act.
    await page.locator('.titlebar').hover()
    await expect(page.locator('.notetip')).toBeHidden()

    // ---- Act 6: the notebook — the one place the Reckoning never reaches ----
    await menu(page, 'Notes').click()
    await expect(page.getByText('Notes never expire')).toBeVisible()
    await expect(page.locator('.statusbar')).toContainText('Never reckoned')
    marks.at('notes-open')
    await beat(page, 1600)

    await page.getByRole('button', { name: 'New', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'Note' })
    await expect(editor).toBeVisible()
    await editor.locator('#ne-title').pressSequentially(NOTE_TITLE, { delay: 40 })
    await editor.locator('#ne-body').pressSequentially(NOTE_BODY, { delay: 20 })
    marks.at('note-written')
    await beat(page, 1200)

    await editor.getByRole('button', { name: 'Save' }).click()
    await expect(editor).toBeHidden()
    await expect(page.locator('.notecard__title')).toHaveText(NOTE_TITLE)
    await expect(page.locator('.statusbar')).toContainText('1 note')
    marks.at('note-saved')
    await beat(page)

    await page.getByRole('button', { name: `Pin "${NOTE_TITLE}"` }).click()
    await expect(page.locator('.notecard--pinned')).toBeVisible()
    marks.at('note-pinned')
    await beat(page, 1200)

    // ---- Act 7: Done — finished work, with an expiry date on it ----
    await menu(page, 'Done').click()
    await expect(page.locator('.taskrow--done')).toContainText(FINISHED)
    await expect(page.locator('.taskrow--done')).toContainText('purges in 30d')
    await expect(page.getByText('Untick to restore')).toBeVisible()
    marks.at('done-open')
    await beat(page, 2000)

    await menu(page, 'Today').click()
    await expect(page.locator('.statusbar')).toContainText('5 active')
    marks.at('back-to-today')
    await beat(page)

    /*
     * ---- Act 8: the next morning ----
     *
     * Rewinding `lastReckoningDate` is the only way to cross a day boundary without waiting
     * overnight (the same trick `simulateTomorrow` exists for). The captured tasks must be
     * backdated too: `reckoningQueue` exempts anything created today, so leaving them alone
     * would produce a two-card queue instead of the five the reel is built around.
     *
     * This is the one reload in the reel, and it reads as the day turning over.
     */
    marks.at('rollover')
    await page.evaluate(
      ({ key, yesterday, today }) => {
        const raw = localStorage.getItem(key)
        if (!raw) throw new Error('demo state missing before rollover')
        const state = JSON.parse(raw)
        state.lastReckoningDate = yesterday
        state.tasks = state.tasks.map((t: Record<string, unknown>) => ({
          ...t,
          createdDate:
            typeof t.createdDate === 'string' && t.createdDate > yesterday
              ? yesterday
              : t.createdDate,
          // Already rung once on camera; this stops it ambushing the reckoning.
          remindedDate: t.remindAt ? today : t.remindedDate,
        }))
        localStorage.setItem(key, JSON.stringify(state))
      },
      { key: STORAGE_KEY, yesterday: localDate(-1), today: localDate(0) },
    )
    await page.reload()

    // ---- Act 9: the Reckoning. No skip, no dismiss, no escape ----
    // Located by class: the overlay is labelled by its heading, so its accessible name is the
    // current task's title rather than "The Reckoning".
    const reckoning = page.locator('.reckoning')
    await expect(page.locator('.titlebar')).toContainText('The Reckoning')
    await expect(page.locator('.reckoning__count')).toHaveText('1/5')
    marks.at('reckoning-start')
    await beat(page, 1800)

    /*
     * Newest first (addTask prepends), then the seeds in the order they were written — which
     * is why the nine-times-dodged task is card 5 of 5 and closes the review.
     *
     * Three keeps then two drops, deliberately: the rhythm is a run of "yes, still mine"
     * before the honesty arrives, rather than a shrug in both directions.
     */
    const decisions = [
      { title: CAPTURED[2], action: 'Keep it' },
      { title: SHARPENED, action: 'Keep it' },
      { title: CARRIED[0].title, action: 'Keep it' },
      { title: CARRIED[1].title, action: 'Drop it' },
      { title: AVOIDED, action: 'Drop it' },
    ] as const

    for (const [i, { title, action }] of decisions.entries()) {
      await expect(page.locator('.reckoning__count')).toHaveText(`${i + 1}/5`)
      await expect(page.locator('.reckoning__title')).toHaveText(title)
      marks.at(`reckoning-card-${i + 1}`)

      // The prompt hardens once a task has been carried six times or more.
      if (title === AVOIDED) {
        await expect(page.locator('.badge--worst')).toContainText('Kept 9× — be honest')
        await expect(
          page.getByText("You've carried this for a while. Is it real work, or is it a wish?"),
        ).toBeVisible()
        marks.at('reckoning-climax')
        await beat(page, 2600)
      } else {
        await beat(page, 1300)
      }

      await reckoning.getByRole('button', { name: action }).click()
    }

    await expect(page.getByText('You reviewed 5 tasks.')).toBeVisible()
    marks.at('reckoning-complete')
    await beat(page, 1800)
    await reckoning.getByRole('button', { name: 'Continue' }).click()

    // ---- Act 10: the result. Six became three, and keeping was not free ----
    await expect(page.locator('.statusbar')).toContainText('3 active')
    await expect(page.locator('.taskrow')).toHaveCount(3)
    await expect(taskTitle(page, AVOIDED)).toBeHidden()
    await expect(taskTitle(page, CARRIED[1].title)).toBeHidden()
    // The survivor that was already at 6 is now at 7 — the badge climbs when you keep, too.
    await expect(page.locator('.badge--bad')).toContainText('Kept 7×')
    await expect(page.getByText('Kept 1×')).toHaveCount(2)
    await expect(page.locator('.statusbar')).toContainText('keep or drop tomorrow')
    marks.at('final-list')

    await beat(page, FINAL_HOLD)
    marks.at('end')

    expect(pageErrors).toEqual([])

    /*
     * Close the page before saving: the webm is only finalised once recording stops, and
     * `saveAs` on a live handle would race the muxer. Writing the landmarks last means a
     * failed run leaves the previous (still-valid) manifest in place next to its video.
     */
    await page.close()
    await video?.saveAs(VIDEO_OUT)
    marks.write(MARKS_OUT)
  })
})
