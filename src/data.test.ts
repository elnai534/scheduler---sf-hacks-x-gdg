import { describe, expect, it } from 'vitest'
import { countConflicts } from './data'
import type { Course } from './data'

const mk = (section: string, start: number, end: number) =>
  ({ code: 'X 1', section, meetings: [{ day: 'Mon', start, end, location: '' }] }) as unknown as Course

describe('countConflicts', () => {
  it('counts overlapping meetings only', () => {
    expect(countConflicts([mk('01', 540, 600), mk('02', 570, 630), mk('03', 600, 660)])).toBe(2)
    expect(countConflicts([mk('01', 540, 600), mk('02', 600, 660)])).toBe(0)
  })
})
