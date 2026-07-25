import { describe, it, expect } from 'vitest'
import { reckoningQueue } from './reckoning'
import { shameTier, shameLabel } from './shame'
import { purge, PURGE_AFTER_DAYS } from './storage'
import type { AppState, Task } from '../types'

function task(over: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'a task',
    notes: '',
    tags: [],
    status: 'active',
    keepCount: 0,
    createdDate: '2026-07-25',
    createdAt: '2026-07-25T10:00:00.000Z',
    ...over,
  }
}

describe('reckoningQueue', () => {
  const today = '2026-07-26'

  it('is empty when there are no tasks', () => {
    expect(reckoningQueue([], today)).toEqual([])
  })

  it('includes active tasks created before today', () => {
    const t = task({ createdDate: '2026-07-25' })
    expect(reckoningQueue([t], today)).toEqual([t])
  })

  it('exempts tasks created today', () => {
    expect(reckoningQueue([task({ createdDate: today })], today)).toEqual([])
  })

  it('ignores completed and dropped tasks', () => {
    const tasks = [
      task({ status: 'completed' }),
      task({ status: 'dropped' }),
      task({ status: 'active' }),
    ]
    expect(reckoningQueue(tasks, today)).toHaveLength(1)
  })

  it('handles a mixed backlog', () => {
    const tasks = [
      task({ createdDate: '2026-01-01' }),
      task({ createdDate: today }),
      task({ createdDate: '2026-07-20', status: 'completed' }),
      task({ createdDate: '2026-07-24' }),
    ]
    expect(reckoningQueue(tasks, today).map((t) => t.createdDate)).toEqual([
      '2026-01-01',
      '2026-07-24',
    ])
  })
})

describe('shameTier', () => {
  it('maps each tier at its boundary', () => {
    expect(shameTier(0)).toBe('none')
    expect(shameTier(1)).toBe('quiet')
    expect(shameTier(2)).toBe('quiet')
    expect(shameTier(3)).toBe('warn')
    expect(shameTier(5)).toBe('warn')
    expect(shameTier(6)).toBe('bad')
    expect(shameTier(8)).toBe('bad')
    expect(shameTier(9)).toBe('worst')
    expect(shameTier(50)).toBe('worst')
  })

  it('labels nothing at zero and escalates at the top', () => {
    expect(shameLabel(0)).toBeNull()
    expect(shameLabel(2)).toBe('Kept 2×')
    expect(shameLabel(11)).toBe('Kept 11× — be honest')
  })
})

describe('purge', () => {
  const today = '2026-07-26'
  const withTasks = (tasks: Task[]): AppState => ({
    tasks,
    notebook: [],
    lastReckoningDate: today,
  })

  it('never purges active tasks, however old', () => {
    const state = withTasks([task({ createdDate: '2020-01-01' })])
    expect(purge(state, today).tasks).toHaveLength(1)
  })

  it('keeps archived tasks inside the retention window', () => {
    const state = withTasks([task({ status: 'dropped', droppedAt: '2026-07-20T10:00:00.000Z' })])
    expect(purge(state, today).tasks).toHaveLength(1)
  })

  it('removes archived tasks past the window', () => {
    const old = '2026-06-01T10:00:00.000Z'
    const state = withTasks([
      task({ status: 'dropped', droppedAt: old }),
      task({ status: 'completed', completedAt: old }),
    ])
    expect(purge(state, today).tasks).toHaveLength(0)
  })

  it('keeps a task on the retention boundary and drops it the day after', () => {
    const edge = task({ status: 'dropped', droppedAt: '2026-06-27T10:00:00.000Z' })
    // 2026-06-27 -> 2026-07-26 is 29 days, still inside a 30-day window.
    expect(purge(withTasks([edge]), today).tasks).toHaveLength(1)
    expect(PURGE_AFTER_DAYS).toBe(30)
    expect(purge(withTasks([edge]), '2026-07-27').tasks).toHaveLength(0)
  })

  it('never touches the notebook — notes do not expire', () => {
    const state: AppState = {
      tasks: [task({ status: 'dropped', droppedAt: '2020-01-01T10:00:00.000Z' })],
      notebook: [
        {
          id: 'n1',
          title: 'Ancient thought',
          body: 'still here',
          pinned: false,
          createdAt: '2019-01-01T10:00:00.000Z',
          updatedAt: '2019-01-01T10:00:00.000Z',
        },
      ],
      lastReckoningDate: today,
    }
    const after = purge(state, today)
    expect(after.tasks).toHaveLength(0)
    expect(after.notebook).toHaveLength(1)
  })
})
