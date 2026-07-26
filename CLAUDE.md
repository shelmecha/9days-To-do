# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev          # Vite dev server on :5173
npm test             # Vitest, single run
npm run test:watch
npm run build        # tsc --noEmit && vite build

npm run icons        # regenerate build/icon.ico + tray.png from scripts/make-icons.mjs
npm run electron:dev # Electron shell against the running dev server (start `npm run dev` first)
npm run dist         # icons + build + package release/9days-To-do.exe (portable, ~72 MB)
```

`npm run dist` **fails or hangs if the app is already running** — the exe holds a lock on
`release/`. Kill the "9days To-do" processes first.

Run a single test file: `npx vitest run src/lib/dates.test.ts`
Run one test by name: `npx vitest run -t "does not fire when the clock has moved backwards"`

## What this app is

A to-do app whose single idea is that **backlogs must shrink**. Nothing carries over silently.

**"9days" is the user's company name (9days Wonder). It is branding, not a mechanic** — there is no 9-day
horizon, sprint, or expiry rule. Don't invent one.

Built as a portfolio/demo piece: it must communicate its idea within ten seconds of a stranger opening it.

## The Reckoning (the core mechanic)

On the first load of a new local calendar day, every still-`active` task **created before today** must be
explicitly **Kept** or **Dropped**, one per full screen, before the list is reachable. No skip, no dismiss.

Rules that are easy to break:

- Fires when local date **>** `lastReckoningDate` (`isNewDay` in `src/lib/dates.ts`). An *earlier* date (clock
  moved backwards, travel, skew) must **not** fire.
- A `null` `lastReckoningDate` does not fire. First-time visitors get today stamped on load in `useStore`, so
  their first reckoning is tomorrow's — a blocking modal on first visit would be hostile and there are no
  leftovers to review anyway.
- Tasks created **today** are exempt (`reckoningQueue`).
- An **empty queue is not a no-op**: it still shows a confirmation and stamps the date, or the reckoning re-fires
  on every load that day.
- `lastReckoningDate` is stamped **only when the queue empties** (`finishReckoning`), while each Keep/Drop
  persists immediately. That combination is what lets a mid-reckoning refresh resume instead of losing decisions.
  Don't "optimize" the per-decision writes into one write at the end.
- Keep → `keepCount += 1`, stays active. Drop → status `dropped`.

`keepCount` drives an escalating shame badge; tiers and thresholds live only in `src/lib/shame.ts`.

## Reminders

A task can carry `remindAt` — a clock time **"HH:MM" for today only**, deliberately not a full datetime, because a
reminder that outlived today would contradict the reckoning.

- `src/lib/reminders.ts` is pure and tested. `isReminderDue` fires only for active tasks, at most once per day
  (`remindedDate`), and only inside a **2-hour grace window** — so reopening the app at night doesn't dump a pile
  of stale morning alarms.
- `useReminders` **polls every 15s rather than using setTimeout**. A timer scheduled hours ahead drifts and dies
  when the machine sleeps; re-reading the clock is immune to both. Don't "improve" this into a long timeout.
- The chime in `src/lib/chime.ts` is **synthesised with Web Audio** — no audio files. Soft sine bells, slow
  attack, `MASTER_GAIN = 0.09`. It's meant to be a nudge, not an alarm; raise the gain cautiously.
- Browsers block audio until a real user gesture, so `primeAudio()` is called on any pointer-down in `App.tsx`.
  Without that, the first reminder of a session would be silent.
- Reminders are suppressed while a reckoning is due — one blocking thing at a time.
- **A closed app cannot fire reminders.** That's why the Electron window hides to the tray instead of quitting.

**There is no "Next day" button any more.** The menu bar is Today / Notes / Done: the app is about finishing
*today*, and a control labelled "tomorrow" argued against the whole point. `simulateTomorrow` still exists in
`useStore` (it rewinds `lastReckoningDate` by a day) because it is the only way to exercise the reckoning without
waiting overnight — call it from the console, or wire a temporary button, when demoing. Don't delete it.

## Notebook

`state.notebook` holds `Note`s, which are **deliberately not tasks**: no status, no reckoning, no purge, no
expiry. The whole reason they live in a separate collection is that the backlog-must-shrink rule would otherwise
force a Keep/Drop decision on a thought that isn't work yet. `purge` must never touch them (there is a test).

- `src/lib/notes.ts` is pure and tested — sorting (pinned first, then `updatedAt` desc), one-line previews,
  search, and the untitled-note label fallback.
- **Pinning must not bump `updatedAt`.** It isn't an edit, and bumping it reshuffles the list out from under the
  user every time they pin something.
- "New" creates the note immediately so the editor has something real to edit. `NoteEditor` therefore
  **deletes a note that was blank on open and is still blank on close** — otherwise every cancelled "New" leaves
  an "Untitled note" card behind.
- Notes were added *after* v1 shipped, so `loadState` **migrates** (`notebook: [] `) rather than bumping `KEY` —
  bumping it would silently orphan every existing task.

## Dialogs

`src/hooks/useDialog.ts` is shared by every dismissible dialog: Tab trap, Escape to close, and **focus restore on
unmount**.

The restore is not a nicety. Without it, closing a dialog left focus on `document.body`, so everything the user
typed next went nowhere and the quick-add looked broken. The reminder dialog made it worst, because it opens on a
timer rather than a click — the user never touched the input, so nothing pointed at focus as the cause. If the
element that opened the dialog is gone by the time it closes (completing a task from the reminder dialog unmounts
its row), focus falls back to the quick-add input, `#qa`.

The **Reckoning does not use this hook** — that overlay is deliberately inescapable, so it must not gain an
Escape key, and the list it reveals focuses its own input on mount.

## Architecture

Vite + React + TypeScript. No backend, no accounts, no network. State lives in `localStorage` under the key
`9days-todo/v1`.

- `src/lib/dates.ts` — `localDateString`, `isNewDay`, `addDays`, `daysBetween`. **Pure, no React.** The
  highest-risk logic in the app (DST, travel, clock skew); it is tested first and thoroughly. All date handling is
  local-calendar, never UTC.
- `src/lib/reckoning.ts` — `reckoningQueue`, the one rule about what gets reckoned.
- `src/lib/notes.ts` — notebook sorting, previews, search. **Pure, no React.**
- `src/lib/shame.ts` — `keepCount` → tier/label.
- `src/lib/storage.ts` — load/save/`purge`. Reads tolerate corrupt JSON; writes swallow quota errors so private
  mode can't brick the UI.
- `src/hooks/useStore.ts` — the only stateful hook. Owns the task list, all mutations, and reckoning state;
  persists on every change via an effect.
- `src/App.tsx` — renders the Reckoning overlay and returns early when one is due, so no list markup exists while
  the reckoning is pending.
- `src/components/win95/` — `Window`, `ShameBadge`, `TagBadge`. Compose these.

Screens: Today (active, sorted most-avoided first), Notes (notebook + Notepad editor), Done (completed only),
task detail dialog, reckoning overlay. Three menu items, no more — the window is 300px wide.

## Data notes

- `Task.createdDate` stores the user's **local** date and must not be derived from `createdAt` in UTC. A task
  created at 11pm local would look like "tomorrow" and be skipped by the next reckoning.
- Dropped/completed tasks are archived, then hard-deleted after `PURGE_AFTER_DAYS` (30), applied on load.
  `clearCompleted` in `useStore` empties the Done list on demand (two-step confirm in `DoneView`).
- **There is no view for dropped tasks.** The Graveyard screen was removed: a drop is a decision to stop caring,
  and a screen full of corpses invites re-litigating it. The `dropped` status and its 30-day purge still exist —
  that machinery is what keeps `drop` cheap and tested — the tasks are simply never shown again.
- **Restoring out of Done is asymmetric on purpose.** A completed task can be un-ticked back to `active`,
  because ticking something off is easy to do by accident (a stray click, or the reminder
  dialog's "Mark done" — that is exactly how it came up). A **dropped** task has no undo: that decision was made
  deliberately, in a reckoning, and an escape hatch there would hollow out the mechanic. Don't add one.
- Changing the shape of `Task` or `AppState` breaks existing saved data. Either bump the `KEY` in `storage.ts` or
  migrate inside `loadState`.

## Conventions

- Win95 look is **hand-rolled CSS** in `src/styles/tokens.css` + `global.css` — no UI library. Classic `#c0c0c0`
  face, `#ffffff`/`#808080`/`#000000` bevels via `--bevel-out`/`--bevel-in`, inverted on `:active`.
- **The UI face is a bundled pixel font, and the type scale exists to serve it.** `src/assets/fonts/` holds a
  pixel-accurate MS Sans Serif recreation (CC BY-SA, "lou" via FontStruct, from 98.css — see its `LICENSE.txt`,
  the attribution is a licence condition). It is **drawn for 11px**: crisp at 11 and exact integer multiples,
  blurry at everything else. So there is exactly **one type size** (`--fs-base: 11px`), plus `--fs-2x: 22px` used
  by a single element (the reckoning counter) and `--fs-mono: 13px` for the Notepad body, which is Courier — an
  outline face with no pixel grid, so it is free of the constraint. **Don't add a 12px or 14px size.** Hierarchy
  is carried by weight, colour, case and bevel instead, which is also how the real Win95 shell did it.
  - `@font-face` lives in `src/styles/fonts.css` and must reference the font from **`src/assets/`, never
    `public/`**. A `public/` font is referenced absolutely and 404s over `file://` in the packaged exe; the build
    only warns. From `src/assets/` Vite fingerprints it into `dist/assets/` beside the emitted CSS, so the URL
    becomes a same-directory `./` reference that cannot break.
  - `--lh` (14px) is pinned in px so row heights no longer depend on the font's internal metrics. Keep every
    vertical padding/margin/line-height **even**, so anything centred lands on a whole pixel. The one deliberate
    exception is `.badge`, at the font's own natural 12px line box — a chip never wraps, and those 2px are what
    keep a task row at 45px so eight still fit.
  - On Windows Chromium `-webkit-font-smoothing` and `text-rendering` are **no-ops**. The only thing that
    actually changes the raster is `app.commandLine.appendSwitch('disable-lcd-text')` in `electron/main.cjs`,
    which removes ClearType's colour fringing. Don't delete it expecting the CSS to cover it.
- **The retro theme never costs accessibility.** Real semantics, real keyboard support, visible focus (the dotted
  outline is both period-accurate and usable). Modals use `role="dialog"` + `aria-modal` and go through
  `useDialog`, which moves focus in **and restores it on close** — see Dialogs above for why the restore matters.
- **The app is a fixed-size vertical window: 300 × 500.** `--app-w` / `--app-h` in `tokens.css` must stay in sync
  with `WIDTH` / `HEIGHT` in `electron/main.cjs`, which locks the outer window (`resizable: false`,
  `useContentSize: true`), **and with the two `@media` guards in `global.css`** (`max-width: 332px`,
  `max-height: 532px` = the frame plus the 16px `.app` padding on each side), which collapse the frame to fill a
  viewport smaller than itself. There is exactly **one layout** — no desktop/mobile fork.
- Chrome is what gives, not the list: paddings are deliberately tight (`.win__body` 6px, `.taskrow` 6px, buttons
  26px tall) so the 300 × 500 frame still shows ~8 rows. Don't "breathe" them back out.
- Because the height is fixed, **body copy must stay short** — one line, always. The task list is the flex child
  that absorbs space (`flex: 1`); long paragraphs push the status bar off the bottom edge. This already happened
  twice. The list view no longer has a footer notice at all: its one line of pitch lives in the right slot of
  `.statusbar` ("keep or drop tomorrow"), which costs no extra vertical space.
- **View components return a fragment, not a wrapper `<div>`.** `.tasklist` / `.notelist` grow via `flex: 1` and
  need `.win__body` as their *direct* flex parent. A wrapper breaks the chain, and the list silently hugs its
  content instead of filling the frame — leaving a grey void. The old ArchiveView shipped with this bug;
  `DoneView`, `NotesView` and the list in `App.tsx` are fragments for the same reason.
- `vite.config.ts` and `vitest.config.ts` are deliberately separate — vitest bundles its own Vite copy, and one
  shared config makes the two `Plugin` types collide.

## Desktop shell (Electron)

`electron/main.cjs` wraps the built app as a Windows exe. Things that will bite you:

- It is **`.cjs`, not `.js`** — `package.json` sets `"type": "module"`, which Electron's main process rejects.
- `vite.config.ts` sets **`base: './'`**. Absolute asset paths 404 over `file://`, so the packaged window would
  render blank. Don't remove it.
- In dev the shell loads `VITE_DEV_URL` if set, else `http://localhost:5173`. Vite hops to 5174/5175 when the
  default port is taken, which otherwise gives you a blank frameless window and no clue why:
  `VITE_DEV_URL=http://localhost:5175 npx electron .`
- The window is **frameless** (`frame: false`) — the app's own Win95 title bar is the real chrome. Its buttons work
  via `electron/preload.cjs` → `window.win95` (see `src/lib/desktop.ts`), and `.titlebar` carries
  `-webkit-app-region: drag` so the window can be moved. In a plain browser `window.win95` is absent and the
  buttons fall back to decorative.
- **`resizable: false` silently clamps *programmatic* resizes too, not just the user's drag handles.** On Windows
  Electron enforces it by pinning the window's min/max size, so `setSize`/`setBounds` become no-ops while
  `setPosition` still applies. This shipped as a real bug in Quick Capture: the widget kept its expanded height on
  Cancel *and* slid 50px down the screen on every open/close, walking itself under the taskbar. Any programmatic
  resize must be wrapped `setResizable(true)` → `setBounds(...)` → `setResizable(false)`, and should be **one
  atomic `setBounds`**, never `setSize` + `setPosition` (which also flashes an intermediate frame).
- **The capture widget anchors from stored `captureX`/`captureBottom`, not from `win.getBounds()`.** Reading the
  live bounds back and building the next position on top of them is what let the error compound into that
  downward walk. Our own `setBounds` also fires `moved`, hence the `suppressMoved` guard — without it the anchor
  overwrites itself.
- **Closing hides to the tray, it does not quit** — reminders can't fire from a closed app. Quitting is only via
  the tray menu. `requestSingleInstanceLock` prevents a second copy double-chiming.
- **The lock makes `npm run electron:dev` fail silently while the exe is running.** A packaged copy sitting in the
  tray owns the lock, so the dev instance exits 0 with no output and no window — it looks like a crash, and the
  real cause is invisible because the tray copy is hidden. Check `Get-Process | Where ProcessName -match '^9days'`
  before debugging anything else, and quit the tray copy first.
- **Dev Electron and the packaged exe have separate `localStorage`.** Different userData dirs, so the dev shell
  opens with an empty list even when the exe is full of tasks. Nothing is lost; don't go looking for a data bug.
- Observed once, undiagnosed: after `Start-Process` on the fresh exe, the 300×500 window existed but stayed
  `IsWindowVisible = False` for ~35s; launching the exe again (`second-instance` → `showWindow`) brought it up.
  Worth remembering before concluding a build is broken.
- **Double-clicking the exe while it's hidden takes 15–20 seconds to bring the window back**, with no feedback in
  the meantime. `second-instance` → `showWindow` is wired up correctly; the delay is the portable stub
  re-extracting ~72 MB to a temp dir before Electron even starts. Measured, not guessed. A user will conclude the
  app is broken and double-click again, so hiding shows a one-time tray balloon pointing at the tray icon, which
  restores instantly. Don't remove that balloon without replacing the affordance. (`showWindow` also handles the
  minimised case; `show()` alone can leave a frameless window unreachable.)
- Icons are **generated, not committed**: `scripts/make-icons.mjs` writes `build/icon.ico` (16–256px) and
  `build/tray.png` using a hand-rolled PNG encoder. Run `npm run icons` after editing it; `npm run dist` does it
  automatically.
- The packaged renderer runs with `nodeIntegration: false` and `contextIsolation: true`. Keep it that way.
- `localStorage` in the exe is scoped to Electron's own user-data directory, so **the desktop app and the browser
  version do not share tasks.** Expected, but surprising if you're testing both.
- The exe is unsigned, so Windows SmartScreen warns on first run. Signing needs a real certificate.

## Deliberately out of scope

Stats/streaks, import/export JSON, cross-device sync, accounts, i18n. Don't add opportunistically.
(Reminders and the notebook *were* on this list and are now built — see above.)

**Known accepted risk:** data lives only in this browser's `localStorage` and there is no export, so clearing site
data destroys it permanently. Nothing in the UI says so any more — the footer notice was cut when the window
shrank. Export is the first thing to revisit.

## Testing

`src/lib/*.test.ts` cover the pure logic (55 tests): local-date formatting, `isNewDay` (same day, next day,
multi-day gap, backwards clock, DST transition), `addDays` across month/year/leap/DST boundaries, the reckoning
queue rules, shame tier boundaries, purge retention edges (including that it never touches the notebook), reminder
due-ness (on the minute, grace window, once-per-day, midnight not wrapping), and note sorting/preview/search.
There are no component tests yet.

Manual checks these can't cover: trigger a reckoning (rewind `lastReckoningDate` in `localStorage`, or call
`simulateTomorrow`), confirm it does **not** re-fire on the next reload, refresh mid-reckoning to confirm it
resumes, hear the chime via **Test** in task properties, and confirm closing the exe leaves it alive in the tray.

One regression worth re-checking by hand after touching any dialog: let a reminder fire, dismiss it, then type
**without clicking anything first**. The text must appear in the quick-add box. If it doesn't, focus restore is
broken again.

### Driving the packaged app without a person at the keyboard

For a **layout** check there is a much cheaper route than driving the exe: point a throwaway Electron main script
at the dev server (`win.loadURL('http://localhost:5173')`, `useContentSize: true` at the frame size) and call
`win.webContents.capturePage()`. It returns the renderer's own pixels regardless of window order, and the same
script can drive the UI through `executeJavaScript` (click the menu, seed tasks, rewind `localStorage` and reload
to force a reckoning). No `PrintWindow`, no packaging, no 20-second stub extraction.

For the packaged exe, both of these cost real time to learn the hard way:

- **Capture with `PrintWindow` (user32), flag `2`.** It grabs the window's own pixels even when the window is
  behind others. Plain `CopyFromScreen` captures whatever happens to be in front, which is actively misleading —
  it once returned a browser window and looked like an app bug.
- **Never decide "the window is gone" from `Get-Process | MainWindowTitle`.** Windows picks a process's "main
  window" heuristically, and a **tooltip** counts: hovering a button long enough for its `title` to appear makes
  `MainWindowTitle` go empty, which reads exactly like the app hiding to the tray. That false negative produced
  two wrong conclusions in one session, including a non-existent "clicking Clear hides the window" bug. Instead
  enumerate top-level windows with `EnumWindows` + `IsWindowVisible`, filtered to the app's PIDs and to windows
  larger than ~100×100 so popups are excluded. Also park the cursor away from the window before capturing.
- Relatedly, **give the portable exe 20+ seconds** before concluding a launch failed — see the Electron section.
