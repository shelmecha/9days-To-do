import { describe, expect, it } from 'vitest'
import type { Note } from '../types'
import { isBlank, matchesQuery, noteLabel, notePreview, sortNotes } from './notes'

function note(over: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'Title',
    body: 'Body',
    pinned: false,
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    ...over,
  }
}

describe('sortNotes', () => {
  it('puts pinned notes above unpinned ones regardless of edit time', () => {
    const older = note({ id: 'pinned', pinned: true, updatedAt: '2026-07-01T00:00:00.000Z' })
    const newer = note({ id: 'fresh', updatedAt: '2026-07-26T00:00:00.000Z' })
    expect(sortNotes([newer, older]).map((n) => n.id)).toEqual(['pinned', 'fresh'])
  })

  it('orders by most recently edited within the same pinned state', () => {
    const a = note({ id: 'a', updatedAt: '2026-07-24T00:00:00.000Z' })
    const b = note({ id: 'b', updatedAt: '2026-07-26T00:00:00.000Z' })
    const c = note({ id: 'c', updatedAt: '2026-07-25T00:00:00.000Z' })
    expect(sortNotes([a, b, c]).map((n) => n.id)).toEqual(['b', 'c', 'a'])
  })

  it('does not mutate the input array', () => {
    const input = [note({ id: 'a' }), note({ id: 'b', pinned: true })]
    sortNotes(input)
    expect(input.map((n) => n.id)).toEqual(['a', 'b'])
  })
})

describe('notePreview', () => {
  it('collapses newlines so the card stays one line', () => {
    expect(notePreview(note({ body: 'first\n\nsecond   third' }))).toBe('first second third')
  })

  it('truncates with an ellipsis at the limit', () => {
    const preview = notePreview(note({ body: 'x'.repeat(200) }), 10)
    expect(preview).toBe(`${'x'.repeat(9)}…`)
    expect(preview.length).toBe(10)
  })

  it('leaves a body exactly at the limit untouched', () => {
    expect(notePreview(note({ body: 'abcde' }), 5)).toBe('abcde')
  })

  it('returns an empty string for an empty body', () => {
    expect(notePreview(note({ body: '   ' }))).toBe('')
  })
})

describe('matchesQuery', () => {
  it('matches everything on a blank or whitespace query', () => {
    expect(matchesQuery(note(), '')).toBe(true)
    expect(matchesQuery(note(), '   ')).toBe(true)
  })

  it('matches title and body case-insensitively', () => {
    const n = note({ title: 'Invoice', body: 'Chase the ACCOUNTANT' })
    expect(matchesQuery(n, 'invo')).toBe(true)
    expect(matchesQuery(n, 'accountant')).toBe(true)
    expect(matchesQuery(n, 'plumber')).toBe(false)
  })
})

describe('noteLabel', () => {
  it('prefers the title', () => {
    expect(noteLabel(note({ title: 'Real title', body: 'ignored' }))).toBe('Real title')
  })

  it('falls back to the first line of the body', () => {
    expect(noteLabel(note({ title: '  ', body: 'first line\nsecond' }))).toBe('first line')
  })

  it('falls back to a placeholder when there is nothing at all', () => {
    expect(noteLabel(note({ title: '', body: '' }))).toBe('Untitled note')
  })
})

describe('isBlank', () => {
  it('is true only when both fields are empty after trimming', () => {
    expect(isBlank('', '')).toBe(true)
    expect(isBlank('  ', '\n ')).toBe(true)
    expect(isBlank('t', '')).toBe(false)
    expect(isBlank('', 'b')).toBe(false)
  })
})
