import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { completedCodes, inProgressCodes, openRequirements, parseDpr } from './parse.ts'

const sample = readFileSync(new URL('./fixtures/sample-dpr.txt', import.meta.url), 'utf8')
const r = parseDpr(sample)
const req = (id: string) => r.requirements.find((q) => q.id === id)!

describe('parseDpr on the de-identified sample report', () => {
  it('reads program, plans and the current term', () => {
    expect(r.career).toBe('Undergraduate')
    expect(r.program).toBe('Undergrad Degree-FA')
    expect(r.plans).toEqual(['Visual Communication Design-BS', 'Computer Science-MN'])
    expect(r.lastTerm).toBe('Fall 2026')
  })
  it('names requirements and their enclosing group and program', () => {
    const q = req('R11958/L0010')
    expect(q.name).toBe('DES 300')
    expect(q.group).toBe('Core Requirements')
    expect(q.section).toBe('B.S. in Visual Communication Design')
    expect(req('R10001/L0030').name).toBe('Graduation Writing Assessment Requirement (GWAR)')
  })
  it('reads the units/courses/GPA lines', () => {
    expect(req('R12828/L0010')).toMatchObject({ kind: 'units', required: 2.68, taken: 0, needed: 2.68, status: 'open' })
    expect(req('R10001/L0030')).toMatchObject({ kind: 'courses', required: 1, needed: 1 })
    expect(req('R10072/L0010')).toMatchObject({ kind: 'gpa', required: 2, status: 'unknown' })
  })
  it('joins wrapped course rows and offering terms', () => {
    const q = req('R11958/L0020')
    expect(q.options[0]).toMatchObject({ code: 'DES 322', title: 'DIGITAL DESIGN FOUNDATIONS II', units: 3, when: 'Fall, Winter, Spring, Summer', status: 'candidate' })
    expect(req('R12831/L0060').satisfiedBy[0]).toMatchObject({ code: 'DES 356', title: 'HISTORY OF DESIGN & TECHNOLOGY' })
  })
  it('handles subjects with a space (AA S 216)', () => {
    expect(req('R12823/L0040').satisfiedBy[0]).toMatchObject({ code: 'AA S 216', status: 'inProgress' })
  })
  it('treats a candidate row with a real term as the student\'s own course (in progress)', () => {
    const q = req('R11957/L0010')
    expect(q.status).toBe('filled')
    expect(q.satisfiedBy[0]).toMatchObject({ code: 'DES 200', status: 'inProgress' })
    expect(q.options).toEqual([])
  })
  it('marks transfer credit, and lists it once per credit from the master list only', () => {
    const transfers = r.courses.filter((c) => c.status === 'transfer')
    expect(transfers.map((c) => c.code)).toEqual(['COMM 100TR', 'CSC 100TR', 'CSC 100TR'])
  })
  it('keeps a multi-line Note with the requirement it belongs to', () => {
    expect(req('R12831/L0090').notes[0]).toMatch(/^The three courses taken in Area 4 .* must be taken in at least two different disciplines\.$/)
  })
  it('lists open requirements with candidate courses, and truncation warnings', () => {
    const open = openRequirements(r).map((q) => q.id)
    expect(open).toContain('R11957/L0020') // DES 222
    expect(open).not.toContain('R11957/L0010') // DES 200 already in progress
    expect(req('R11959/L0020').optionsTotal).toBe(38)
    expect(r.warnings.some((w) => /Major Electives: the report lists 38 courses but only 5/.test(w))).toBe(true)
    expect(r.warnings.some((w) => /DES 222/.test(w))).toBe(false) // "1-2 of 2" is complete
  })
  it('splits courses into completed-style codes and in-progress codes', () => {
    expect(inProgressCodes(r)).toEqual(new Set(['AA S 216', 'AA S 330', 'DES 356', 'DES 200', 'DES 228', 'DES 370']))
    expect(completedCodes(r)).toEqual(new Set(['COMM 100TR', 'CSC 100TR']))
  })
})

describe('privacy and robustness', () => {
  it('never copies a student name or ID from the pasted text', () => {
    const withPii = `Pat Example ID 123456789\n${sample}\nOPRID=123456789`
    const json = JSON.stringify(parseDpr(withPii))
    expect(json).not.toMatch(/Pat Example|123456789/)
  })
  it('returns an empty report for unrelated text', () => {
    const e = parseDpr('hello world\nnothing here')
    expect(e.requirements).toEqual([])
    expect(e.courses).toEqual([])
  })
  it('accepts Windows line endings', () => {
    expect(parseDpr(sample.replace(/\n/g, '\r\n')).requirements.length).toBe(r.requirements.length)
  })
})
