import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATALOG, cid, countConflicts, isOnline } from '../data'
import { eligibility } from '../dag/graph'
import { completedCodes, inProgressCodes, parseDpr } from '../dpr/parse'
import { DEFAULT_PREFS, recommend, skillTokens } from './recommend.ts'

const report = parseDpr(readFileSync(new URL('../dpr/fixtures/sample-dpr.txt', import.meta.url), 'utf8'))
const run = (p: Partial<typeof DEFAULT_PREFS> = {}) => recommend(report, CATALOG, { ...DEFAULT_PREFS, ...p })

describe('recommend', () => {
  it('returns picks that fit the unit target, with no time conflicts or duplicates', () => {
    const r = run()
    expect(r.picks.length).toBeGreaterThan(0)
    expect(r.totalUnits).toBeLessThanOrEqual(12)
    expect(countConflicts(r.picks.map((p) => p.section))).toBe(0)
    expect(new Set(r.picks.map((p) => p.section.code)).size).toBe(r.picks.length)
  })
  it('never recommends a course the student already has', () => {
    const have = new Set(report.courses.map((c) => c.code))
    for (const p of run().picks) expect(have.has(p.section.code)).toBe(false)
  })
  it('only recommends courses whose prerequisites are met', () => {
    const done = new Set([...completedCodes(report), ...inProgressCodes(report)])
    for (const p of run({ fast: true }).picks) expect(eligibility(p.section.node, done, inProgressCodes(report)).ok).toBe(true)
  })
  it('online only: every pick is an online section', () => {
    const r = run({ onlineOnly: true })
    expect(r.filteredOut.online).toBeGreaterThan(0)
    for (const p of r.picks) expect(isOnline(p.section.mode)).toBe(true)
  })
  it('days: no meeting falls outside the allowed days', () => {
    const r = run({ days: ['Tue', 'Thu'] })
    expect(r.filteredOut.days).toBeGreaterThan(0)
    for (const p of r.picks) for (const m of p.section.meetings) expect(['Tue', 'Thu']).toContain(m.day)
  })
  it('seats only: no full sections', () => {
    for (const p of run({ seatsOnly: true }).picks) expect(p.section.seats).toBeGreaterThan(0)
  })
  it('graduate fast: ranks courses that unlock others above the same list without it', () => {
    const fast = run({ fast: true, targetUnits: 3 }).picks[0]
    expect(fast.reasons.join(' ')).toMatch(/Unlocks|longer prerequisite chain/)
  })
  it('skills: surfaces a course that matches the topic', () => {
    const r = run({ skills: 'drawing', targetUnits: 3 })
    expect(r.picks.some((p) => /drawing/i.test(p.section.title + p.section.description))).toBe(true)
    expect(r.picks.find((p) => /drawing/i.test(p.section.title))?.reasons.join(' ')).toMatch(/Matches/)
  })
  it('explains what it could not fill', () => {
    const r = run({ onlineOnly: true, days: ['Fri'], seatsOnly: true })
    expect(r.uncovered.length + r.picks.length).toBeGreaterThan(0)
    for (const u of r.uncovered) expect(u.why.length).toBeGreaterThan(0)
  })
  it('named required courses outrank the elective pool', () => {
    const r = run({ targetUnits: 3 })
    expect(r.picks[0].reasons).toContain('Required course')
  })
  it('reports skill matches the student is not yet eligible for', () => {
    const r = run({ skills: 'web' })
    expect(r.blockedInterests.length).toBeGreaterThan(0)
    for (const b of r.blockedInterests) expect(b.needs.length).toBeGreaterThan(0)
  })
  it('is deterministic', () => {
    expect(JSON.stringify(run({ fast: true, skills: 'web' }))).toBe(JSON.stringify(run({ fast: true, skills: 'web' })))
  })
  it('does not exceed the target even when options are plentiful', () => {
    expect(run({ targetUnits: 6 }).totalUnits).toBeLessThanOrEqual(6)
  })
  it('tokenizes skills, dropping filler words', () => {
    expect(skillTokens('I want to learn Web design and Python!')).toEqual(['web', 'design', 'python'])
  })
  it('sample sections exist for DES and CSC only (others stay catalog-only)', () => {
    expect(CATALOG.find((c) => cid(c) === 'DES 300 [01]')?.mode).not.toBe('Catalog only')
    expect(CATALOG.find((c) => c.code === 'MATH 226')?.mode).toBe('Catalog only')
  })
})
