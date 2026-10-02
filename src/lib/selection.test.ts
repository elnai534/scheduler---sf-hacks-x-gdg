import { describe, expect, it } from 'vitest'
import { toggleId } from './selection'

describe('toggleId', () => {
  it('selects, toggles off, and keeps others', () => {
    expect(toggleId([], 'A')).toEqual(['A'])
    expect(toggleId(['A', 'B'], 'A')).toEqual(['B'])
    expect(toggleId(['A'], 'A')).toEqual([])
  })
})
