import { describe, expect, it } from 'vitest'
import { demoState, isDemoPath } from './demo'
import { isNewDay } from './dates'
import { reckoningQueue } from './reckoning'
import { shameTier } from './shame'

const TODAY = '2026-07-29'

describe('isDemoPath', () => {
  it('matches the demo route and nothing else', () => {
    expect(isDemoPath('/demo')).toBe(true)
    expect(isDemoPath('/demo/')).toBe(true)
  })

  it('leaves the real app alone', () => {
    expect(isDemoPath('/')).toBe(false)
    expect(isDemoPath('/index.html')).toBe(false)
    // How the packaged exe loads: file:// path ending in dist/index.html.
    expect(isDemoPath('/C:/apps/9days/dist/index.html')).toBe(false)
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
})
