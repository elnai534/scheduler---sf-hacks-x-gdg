import { describe, expect, it } from 'vitest'
import { SKIP_DELETE_KEY, readSkipDeleteConfirm, shouldConfirmDelete, writeSkipDeleteConfirm } from './deleteConfirm'

const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }

describe('shouldConfirmDelete', () => {
  it('confirms removals unless opted out, never adds', () => {
    expect(shouldConfirmDelete(true, false)).toBe(true)
    expect(shouldConfirmDelete(true, true)).toBe(false)
    expect(shouldConfirmDelete(false, false)).toBe(false)
  })
})

describe('skip preference storage', () => {
  it('defaults to false and round-trips', () => {
    const s = mem()
    expect(readSkipDeleteConfirm(s)).toBe(false)
    expect(writeSkipDeleteConfirm(true, s)).toBe(true)
    expect(s.m.get(SKIP_DELETE_KEY)).toBe('1')
    expect(readSkipDeleteConfirm(s)).toBe(true)
    writeSkipDeleteConfirm(false, s)
    expect(readSkipDeleteConfirm(s)).toBe(false)
  })
  it('honors the legacy key', () => {
    const s = mem(); s.setItem('skipRemoveConfirm', '1')
    expect(readSkipDeleteConfirm(s)).toBe(true)
  })
  it('falls back safely when storage is missing or throws', () => {
    expect(readSkipDeleteConfirm(null)).toBe(false)
    expect(writeSkipDeleteConfirm(true, null)).toBe(false)
    expect(readSkipDeleteConfirm(broken)).toBe(false)
    expect(writeSkipDeleteConfirm(true, broken)).toBe(false)
  })
})
