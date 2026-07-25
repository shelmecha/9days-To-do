import { describe, it, expect } from 'vitest'
import { localDateString, isNewDay, addDays, daysBetween } from './dates'

describe('localDateString', () => {
  it('formats as YYYY-MM-DD with padding', () => {
    expect(localDateString(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05')
    expect(localDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('uses the local date, not UTC', () => {
    // 11pm local on the 5th must not read as the 6th, whatever the machine's offset is.
    const late = new Date(2026, 5, 5, 23, 0)
    expect(localDateString(late)).toBe('2026-06-05')
  })
})

describe('isNewDay', () => {
  it('does not fire for a first-time user', () => {
    expect(isNewDay(null, new Date(2026, 6, 26))).toBe(false)
  })

  it('does not fire on the same day', () => {
    expect(isNewDay('2026-07-26', new Date(2026, 6, 26, 14, 0))).toBe(false)
  })

  it('fires on the next day', () => {
    expect(isNewDay('2026-07-25', new Date(2026, 6, 26, 0, 1))).toBe(true)
  })

  it('fires after a multi-day absence', () => {
    expect(isNewDay('2026-07-01', new Date(2026, 6, 26))).toBe(true)
  })

  it('does not fire when the clock has moved backwards', () => {
    expect(isNewDay('2026-07-26', new Date(2026, 6, 25))).toBe(false)
  })

  it('fires exactly once across a DST transition day', () => {
    // US DST spring-forward 2026-03-08. Both sides of the jump are the same local date.
    expect(isNewDay('2026-03-08', new Date(2026, 2, 8, 1, 30))).toBe(false)
    expect(isNewDay('2026-03-08', new Date(2026, 2, 8, 3, 30))).toBe(false)
    expect(isNewDay('2026-03-08', new Date(2026, 2, 9, 0, 30))).toBe(true)
  })
})

describe('addDays', () => {
  it('moves forwards and backwards', () => {
    expect(addDays('2026-07-26', 1)).toBe('2026-07-27')
    expect(addDays('2026-07-26', -1)).toBe('2026-07-25')
  })

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('does not slip across a DST boundary', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
  })
})

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-07-26', '2026-07-26')).toBe(0)
    expect(daysBetween('2026-07-01', '2026-07-31')).toBe(30)
    expect(daysBetween('2026-07-31', '2026-07-01')).toBe(-30)
  })

  it('is unaffected by a DST transition in the span', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  })
})
