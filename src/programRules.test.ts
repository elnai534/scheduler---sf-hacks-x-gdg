import { describe, expect, it } from 'vitest'
import { applyChange, degreeEnabled, majorEnabled, minorEnabled, validMajor } from './programRules'

const empty = { career: '', degree: '', major: '', minor: '' }

describe('programRules', () => {
  it('accepts a valid pair and rejects an invalid one', () => {
    expect(validMajor('Bachelor of Science', 'Computer Science')).toBe(true)
    expect(validMajor('Bachelor of Arts', 'Computer Science')).toBe(false)
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
    expect(applyChange(p, 'degree', 'Bachelor of Arts').major).toBe('')
    expect(applyChange(p, 'degree', 'Bachelor of Science').major).toBe('Computer Science')
    expect(applyChange({ ...empty, minor: 'Computer Science' }, 'major', 'Computer Science').minor).toBe('')
  })
})
