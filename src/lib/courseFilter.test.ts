import { describe, expect, it } from 'vitest'
import { EMPTY_FILTER, filterCourses, isFiltered, levelOf, subjectOf } from './courseFilter'

const cs = [
  { code: 'DES 200', title: 'Visual Design Literacy' },
  { code: 'DES 299', title: 'Lower Edge' },
  { code: 'CSC 300', title: 'Algorithms' },
  { code: 'CSC 699', title: 'Upper Edge' },
  { code: 'CSC 700', title: 'Graduate Seminar' },
  { code: 'MATH 150', title: 'Calculus' },
]
const codes = (f: Partial<typeof EMPTY_FILTER>) => filterCourses(cs, { ...EMPTY_FILTER, ...f }).map((c) => c.code)

describe('levelOf', () => {
  it('splits at 300 and 700', () => {
    expect(levelOf('DES 299')).toBe('Lower Division')
    expect(levelOf('CSC 300')).toBe('Upper Division')
    expect(levelOf('CSC 699')).toBe('Upper Division')
    expect(levelOf('CSC 700')).toBe('Graduate')
    expect(levelOf('MATH 150')).toBe('Lower Division')
  })
  it('reads subject', () => expect(subjectOf('MATH 150')).toBe('MATH'))
})

describe('filterCourses', () => {
  it('empty filter keeps all', () => { expect(codes({})).toHaveLength(6); expect(isFiltered(EMPTY_FILTER)).toBe(false) })
  it('searches code and title', () => {
    expect(codes({ q: 'des 2' })).toEqual(['DES 200', 'DES 299'])
    expect(codes({ q: 'calculus' })).toEqual(['MATH 150'])
  })
  it('filters by level', () => {
    expect(codes({ level: 'Upper Division' })).toEqual(['CSC 300', 'CSC 699'])
    expect(codes({ level: 'Graduate' })).toEqual(['CSC 700'])
  })
  it('combines filters', () => {
    expect(codes({ subject: 'CSC', level: 'Upper Division', q: 'alg' })).toEqual(['CSC 300'])
  })
  it('returns empty when nothing matches', () => {
    expect(codes({ subject: 'DES', level: 'Graduate' })).toEqual([])
    expect(isFiltered({ ...EMPTY_FILTER, q: ' ' })).toBe(false)
  })
})
