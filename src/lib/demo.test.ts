import { describe, expect, it } from 'vitest'
import { demoState, isDemoPath } from './demo'
import { isNewDay } from './dates'
import { reckoningQueue } from './reckoning'
import { shameTier } from './shame'
import { purge, storageKeyFor } from './storage'

const TODAY = '2026-07-29'

describe('isDemoPath', () => {
  it('matches the demo route and nothing else', () => {
    expect(isDemoPath('/demo')).toBe(true)
    expect(isDemoPath('/demo/')).toBe(true)
  })

  it('leaves the real app alone', () => {
    // The landing page.
    expect(isDemoPath('/')).toBe(false)
    expect(isDemoPath('/index.html')).toBe(false)
    // The app served directly, and how the dev server loads it for the Electron shell.
    expect(isDemoPath('/app.html')).toBe(false)
    // How the packaged exe loads: a file:// path ending in dist/app.html.
    expect(isDemoPath('/C:/apps/9days/dist/app.html')).toBe(false)
    // A path that merely starts with the same letters must not count.
    expect(isDemoPath('/demonstration')).toBe(false)
  })
})

describe('demoState', () => {
  it('fires the reckoning immediately — the whole point of the seed', () => {
    const state = demoState(TODAY)
    expect(isNewDay(state.lastReckoningDate, new Date(2026, 6, 29, 9, 0))).toBe(true)
  })

  it('queues every active task, since none were created today', () => {
    const state = demoState(TODAY)
    const active = state.tasks.filter((t) => t.status === 'active')
    expect(reckoningQueue(state.tasks, TODAY)).toHaveLength(active.length)
    expect(active.length).toBeGreaterThan(2)
  })

  it('walks the shame ladder so the badge tiers are all visible', () => {
    const tiers = new Set(
      reckoningQueue(demoState(TODAY).tasks, TODAY).map((t) => shameTier(t.keepCount)),
    )
    expect(tiers.has('worst')).toBe(true)
    expect(tiers.has('none')).toBe(true)
    expect(tiers.size).toBeGreaterThanOrEqual(3)
  })

  it('leaves completed tasks out of the queue but in the list', () => {
    const state = demoState(TODAY)
    const completed = state.tasks.filter((t) => t.status === 'completed')
    expect(completed.length).toBeGreaterThan(0)
    const queued = reckoningQueue(state.tasks, TODAY).map((t) => t.id)
    for (const t of completed) expect(queued).not.toContain(t.id)
  })

  it('shows at least one task with notes, so the ✎ affordance is discoverable', () => {
    expect(demoState(TODAY).tasks.some((t) => t.notes.trim().length > 0)).toBe(true)
  })

  it('pre-stamps the reminder so no chime ambushes a visitor', () => {
    for (const t of demoState(TODAY).tasks.filter((t) => t.remindAt)) {
      expect(t.remindedDate).toBe(TODAY)
    }
  })

  it('dates everything in the past, never in the future', () => {
    for (const t of demoState(TODAY).tasks) expect(t.createdDate < TODAY).toBe(true)
  })

  it('seeds the notebook so the Notes screen is not empty', () => {
    expect(demoState(TODAY).notebook.length).toBeGreaterThan(0)
  })

  /**
   * Rot guard. The fixture only ever runs in production, so nothing else would notice it drifting
   * out of step with the rules around it — the demo would just quietly render an empty screen.
   * These assert the seed still survives the exact transformation useStore applies on load.
   */
  it('survives the load-time purge with every task intact', () => {
    const seeded = demoState(TODAY)
    const after = purge(seeded, TODAY)
    expect(after.tasks).toHaveLength(seeded.tasks.length)
    expect(after.notebook).toHaveLength(seeded.notebook.length)
  })

  it('still fires the reckoning after purge, not just before it', () => {
    const after = purge(demoState(TODAY), TODAY)
    expect(isNewDay(after.lastReckoningDate, new Date(2026, 6, 29, 9, 0))).toBe(true)
    expect(reckoningQueue(after.tasks, TODAY).length).toBeGreaterThan(0)
  })
})

// `markDemoSeeded` reads window/sessionStorage, so its regression lives in
// e2e/demo-isolation.spec.ts where there is a real browser. A skipped unit test here would read
// as coverage while asserting nothing.

/**
 * The demo and the real app share an origin, so without this split one visit to /demo would
 * overwrite the tasks of anyone using the app at /app.html.
 */
describe('storageKeyFor', () => {
  it('gives the demo its own key', () => {
    expect(storageKeyFor('/demo')).not.toBe(storageKeyFor('/'))
    expect(storageKeyFor('/demo/')).toBe(storageKeyFor('/demo'))
  })

  it('keeps every non-demo entry point on the real key', () => {
    const real = storageKeyFor('/')
    expect(storageKeyFor('/app.html')).toBe(real)
    expect(storageKeyFor('/index.html')).toBe(real)
    // The packaged exe, loading over file://.
    expect(storageKeyFor('/C:/apps/9days/dist/app.html')).toBe(real)
  })

  it('does not change the real key — that would orphan every existing task', () => {
    expect(storageKeyFor('/')).toBe('9days-todo/v1')
  })
})
