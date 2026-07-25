import { describe, it, expect } from 'vitest'
import {
  isValidTime,
  minutesOfDay,
  currentTimeString,
  isReminderDue,
  dueReminders,
  GRACE_MINUTES,
} from './reminders'
import type { Task } from '../types'

const TODAY = '2026-07-26'

function task(over: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'a task',
    notes: '',
    tags: [],
    status: 'active',
    keepCount: 0,
    createdDate: TODAY,
    createdAt: '2026-07-26T08:00:00.000Z',
    ...over,
  }
}

/** A Date at a local wall-clock time on TODAY. */
function at(hh: number, mm: number): Date {
  return new Date(2026, 6, 26, hh, mm, 0)
}

describe('isValidTime', () => {
  it('accepts 24-hour times', () => {
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('09:05')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
  })

  it('rejects malformed and out-of-range values', () => {
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('12:60')).toBe(false)
    expect(isValidTime('9:05')).toBe(false)
    expect(isValidTime('')).toBe(false)
    expect(isValidTime('noon')).toBe(false)
  })
})

describe('minutesOfDay', () => {
  it('converts to minutes since midnight', () => {
    expect(minutesOfDay('00:00')).toBe(0)
    expect(minutesOfDay('01:30')).toBe(90)
    expect(minutesOfDay('23:59')).toBe(1439)
  })

  it('returns null for junk', () => {
    expect(minutesOfDay('99:99')).toBeNull()
  })
})

describe('currentTimeString', () => {
  it('pads to HH:MM in local time', () => {
    expect(currentTimeString(at(9, 5))).toBe('09:05')
    expect(currentTimeString(at(14, 30))).toBe('14:30')
  })
})

describe('isReminderDue', () => {
  it('is false when no reminder is set', () => {
    expect(isReminderDue(task(), at(12, 0), TODAY)).toBe(false)
  })

  it('is false before the reminder time', () => {
    expect(isReminderDue(task({ remindAt: '14:30' }), at(14, 29), TODAY)).toBe(false)
  })

  it('fires exactly on the minute', () => {
    expect(isReminderDue(task({ remindAt: '14:30' }), at(14, 30), TODAY)).toBe(true)
  })

  it('still fires shortly after, so a busy minute is not missed', () => {
    expect(isReminderDue(task({ remindAt: '14:30' }), at(15, 0), TODAY)).toBe(true)
  })

  it('goes quiet once past the grace window', () => {
    expect(GRACE_MINUTES).toBe(120)
    const t = task({ remindAt: '09:00' })
    expect(isReminderDue(t, at(11, 0), TODAY)).toBe(true)
    expect(isReminderDue(t, at(11, 1), TODAY)).toBe(false)
    expect(isReminderDue(t, at(22, 0), TODAY)).toBe(false)
  })

  it('only fires once per day', () => {
    const t = task({ remindAt: '14:30', remindedDate: TODAY })
    expect(isReminderDue(t, at(14, 30), TODAY)).toBe(false)
  })

  it('fires again the next day', () => {
    const t = task({ remindAt: '14:30', remindedDate: '2026-07-25' })
    expect(isReminderDue(t, at(14, 30), TODAY)).toBe(true)
  })

  it('ignores completed and dropped tasks', () => {
    expect(isReminderDue(task({ remindAt: '14:30', status: 'completed' }), at(14, 30), TODAY)).toBe(
      false,
    )
    expect(isReminderDue(task({ remindAt: '14:30', status: 'dropped' }), at(14, 30), TODAY)).toBe(
      false,
    )
  })

  it('handles midnight without wrapping', () => {
    expect(isReminderDue(task({ remindAt: '00:00' }), at(0, 0), TODAY)).toBe(true)
    // 23:00 is not "23 hours late" for a 00:00 reminder — it must not fire.
    expect(isReminderDue(task({ remindAt: '00:00' }), at(23, 0), TODAY)).toBe(false)
  })
})

describe('dueReminders', () => {
  it('returns only due tasks, earliest scheduled first', () => {
    const tasks = [
      task({ title: 'late', remindAt: '10:00' }),
      task({ title: 'not yet', remindAt: '18:00' }),
      task({ title: 'early', remindAt: '09:30' }),
      task({ title: 'none' }),
    ]
    expect(dueReminders(tasks, at(10, 30), TODAY).map((t) => t.title)).toEqual(['early', 'late'])
  })

  it('returns nothing when no reminders are set', () => {
    expect(dueReminders([task(), task()], at(12, 0), TODAY)).toEqual([])
  })
})
