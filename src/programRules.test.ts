import { describe, expect, it } from 'vitest'
import { applyChange, DEGREES, MAJORS, MAJORS_BY_DEGREE, MINORS, degreeEnabled, majorEnabled, minorEnabled, validMajor } from './programRules'

const empty = { career: '', degree: '', major: '', minor: '' }

describe('programRules', () => {
  it('accepts a valid pair and rejects an invalid one', () => {
    expect(validMajor('Bachelor of Science', 'Computer Science')).toBe(true)
    expect(validMajor('Bachelor of Arts', 'Computer Science')).toBe(false) // unknown degree has no majors
    expect(validMajor('', 'Computer Science')).toBe(true)
  })
  it('disables incompatible options in the other selects', () => {
    const p = { ...empty, major: 'Computer Science' }
    expect(degreeEnabled(p, 'Bachelor of Arts')).toBe(false)
    expect(degreeEnabled(p, 'Bachelor of Science')).toBe(true)
    expect(minorEnabled(p, 'Computer Science')).toBe(false)
    expect(majorEnabled({ ...empty, degree: 'Bachelor of Arts' }, 'Computer Science')).toBe(false)
  })
  it('resets another field when it becomes invalid', () => {
    const p = { ...empty, degree: 'Bachelor of Science', major: 'Computer Science' }
        expect(applyChange(p, 'degree', 'Bachelor of Science').major).toBe('Computer Science')
    expect(applyChange({ ...empty, minor: 'Computer Science' }, 'major', 'Computer Science').minor).toBe('')
  })
  it('has no dead end or invalid pair across every reachable combination', () => {
    const vals = (xs: readonly string[]) => ['', ...xs]
    expect(DEGREES.length).toBeGreaterThan(0)
    for (const d of DEGREES) expect(MAJORS_BY_DEGREE[d].length).toBeGreaterThan(0)
    for (const m of MAJORS) expect(DEGREES.some((d) => validMajor(d, m))).toBe(true)
    // Walk every state reachable by picking options the UI leaves enabled.
    for (const d0 of vals(DEGREES)) for (const m0 of vals(MAJORS)) for (const n0 of vals(MINORS)) {
      let p = { ...empty, degree: d0, major: m0, minor: n0 }
      const ok = (x: typeof p) => validMajor(x.degree, x.major) && !(x.major && x.major === x.minor)
      if (!ok(p)) continue // not reachable: UI never allows this state
      // every enabled option must lead to a valid state after applyChange
      for (const d of DEGREES) if (degreeEnabled(p, d)) expect(ok(applyChange(p, 'degree', d))).toBe(true)
      for (const m of MAJORS) if (majorEnabled(p, m)) expect(ok(applyChange(p, 'major', m))).toBe(true)
      for (const n of MINORS) if (minorEnabled(p, n)) expect(ok(applyChange(p, 'minor', n))).toBe(true)
      // no select is left with only disabled options
      expect(DEGREES.some((d) => degreeEnabled(p, d))).toBe(true)
      expect(MAJORS.some((m) => majorEnabled(p, m))).toBe(true)
      expect(MINORS.some((n) => minorEnabled(p, n))).toBe(true)
      p = applyChange(p, 'minor', '')
      expect(ok(p)).toBe(true)
    }
  })
})
