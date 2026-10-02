import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBulletinHtml, parsePrereqText } from './parse.ts'

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}.mini.html`, import.meta.url), 'utf8')
const codes = (t: string) => parsePrereqText(t).prereqGroups.map((g) => g.anyOf)

describe('parsePrereqText', () => {
  it('splits AND across commas and "and"', () => {
    expect(codes('CSC 256, CSC 340, MATH 324, and PHYS 230 with grades of C or better.')).toEqual([['CSC 256'], ['CSC 340'], ['MATH 324'], ['PHYS 230']])
  })
  it('treats "or" as alternatives inside one group', () => {
    expect(codes('CSC 210 or CSC 215 with a grade of C or better.')).toEqual([['CSC 210', 'CSC 215']])
  })
  it('mixes OR then AND', () => {
    expect(codes('CSC 210 or CSC 215 or ENGR 213, and MATH 227')).toEqual([['CSC 210', 'CSC 215', 'ENGR 213'], ['MATH 227']])
  })
  it('keeps non-course restrictions as notes and makes no edges', () => {
    const r = parsePrereqText('Restricted to Design majors and minors; GE Area 1A/A2.')
    expect(r.prereqGroups).toEqual([])
    expect(r.notes).toEqual(['Restricted to Design majors and minors', 'GE Area 1A/A2'])
  })
  it('does not split a non-course sentence on "and"', () => {
    expect(parsePrereqText('Restricted to Biology, Chemistry, and Biochemistry majors').notes).toHaveLength(1)
  })
  it('attaches "; or permission of the instructor" to previous groups as an alternative', () => {
    const r = parsePrereqText('DES 200, DES 356; or permission of the instructor.')
    expect(r.permissionWaiver).toBe(true)
    expect(r.prereqGroups.every((g) => g.alt.includes('permission of the instructor'))).toBe(true)
    expect(r.notes).toEqual([])
  })
  it('only an explicit "(may be taken concurrently)" makes a course non-blocking', () => {
    const r = parsePrereqText('CSC 210 or CSC 215, and MATH 227 (may be taken concurrently) with grades of C or better.')
    expect(r.concurrentOk).toEqual(['MATH 227'])
    expect(r.prereqGroups).toEqual([{ anyOf: ['CSC 210', 'CSC 215'], alt: [] }])
  })
  it('keeps a bare asterisk as a strict prerequisite (meaning unconfirmed)', () => {
    const r = parsePrereqText('DES 200 * and DES 222 *.')
    expect(r.concurrentOk).toEqual([])
    expect(codes('DES 200 * and DES 222 *.')).toEqual([['DES 200'], ['DES 222']])
  })
  it('extracts co-requisites separately', () => {
    const r = parsePrereqText('CSC 210 or CSC 215; concurrent enrollment in CSC 220.')
    expect(r.coreqs).toEqual(['CSC 220'])
    expect(r.prereqGroups).toEqual([{ anyOf: ['CSC 210', 'CSC 215'], alt: [] }])
  })
  it('a recommended co-requisite is only a note', () => {
    const r = parsePrereqText('CSC 220; concurrent enrollment in CSC 340 recommended.')
    expect(r.coreqs).toEqual([])
    expect(r.notes.join(' ')).toMatch(/recommended/)
  })
  it('drops "or equivalent" and grade clauses', () => {
    expect(codes('CSC 306* or equivalent.')).toEqual([['CSC 306']])
  })
  it('handles empty text', () => {
    expect(parsePrereqText('')).toMatchObject({ prereqGroups: [], coreqs: [], notes: [] })
  })
})

describe('parseBulletinHtml edge cases', () => {
  const block = (title: string) => `<div class="courseblock"><p class="courseblocktitle"><strong>${title}</strong></p><p class="noindent courseblockdesc">Desc.</p></div>`
  it('keeps multi-letter code suffixes in the code and out of the title', () => {
    const c = parseBulletinHtml(block('MATH\u00a0896EXM\u00a0 Culminating Experience Examination (Units: 0)'))[0]
    expect(c.code).toBe('MATH 896EXM')
    expect(c.title).toBe('Culminating Experience Examination')
    expect(c.units).toBe(0)
  })
  it('uses the lower bound of a unit range', () => {
    expect(parseBulletinHtml(block('BIOL\u00a0699\u00a0 Independent Study (Units: 1-3)'))[0].units).toBe(1)
  })
})

describe('parseBulletinHtml (saved real bulletin markup)', () => {
  it('parses code, title, units, description', () => {
    const c = parseBulletinHtml(fixture('des')).find((x) => x.code === 'DES 200')!
    expect(c.title).toBe('Visual Design Literacy')
    expect(c.units).toBe(3)
    expect(c.description).toMatch(/^Fundamental visual design principles/)
    expect(c.description).not.toMatch(/[<>]/)
  })
  it('parses real DES prerequisites', () => {
    const c = parseBulletinHtml(fixture('des')).find((x) => x.code === 'DES 278')!
    expect(c.prereqGroups.map((g) => g.anyOf)).toEqual([['DES 200'], ['DES 222']])
    expect(c.notes).toEqual(['Restricted to Design majors and minors'])
  })
  it('parses real CSC prerequisites with concurrency', () => {
    const c = parseBulletinHtml(fixture('csc')).find((x) => x.code === 'CSC 230')!
    expect(c.prereqGroups.map((g) => g.anyOf)).toEqual([['CSC 210', 'CSC 215', 'ENGR 213']])
    expect(c.concurrentOk).toEqual(['MATH 227'])
  })
  it('ignores "Prerequisite for ..." lines (graduate lists)', () => {
    for (const c of parseBulletinHtml(fixture('csc'))) expect(c.prereqText).not.toMatch(/^for /)
  })
})
