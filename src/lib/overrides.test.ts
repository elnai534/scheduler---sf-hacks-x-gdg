import { describe, expect, it } from 'vitest'
import type { DprReport, DprRequirement } from '../dpr/types'
import { applyOverrides, setOverride } from './overrides'

const q = (id: string, status: DprRequirement['status'], needed = 3): DprRequirement =>
  ({ id, name: id, group: '', section: 'S', kind: 'units', required: 3, taken: 0, needed, status, satisfiedBy: [], options: [], optionsTotal: null, notes: [] })
const report = { career: '', program: '', plans: [], lastTerm: '', warnings: [], courses: [], requirements: [q('a', 'open'), q('b', 'filled', 0)] } as DprReport

describe('applyOverrides', () => {
  it('returns the report untouched with no overrides', () => expect(applyOverrides(report, {})).toBe(report))
  it('marks an open requirement done and a filled one open, leaving the original alone', () => {
    const out = applyOverrides(report, { a: 'filled', b: 'open' })!
    expect(out.requirements.map((x) => [x.status, x.needed])).toEqual([['filled', 0], ['open', 1]])
    expect(report.requirements[0].status).toBe('open')
  })
  it('handles a null report', () => expect(applyOverrides(null, { a: 'filled' })).toBeNull())
})

describe('setOverride', () => {
  it('sets when different from the report and clears when it matches', () => {
    const on = setOverride({}, 'a', 'open', 'filled')
    expect(on).toEqual({ a: 'filled' })
    expect(setOverride(on, 'a', 'open', 'open')).toEqual({})
  })
})
