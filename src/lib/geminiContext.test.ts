import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATALOG, SCHEDULABLE, byId } from '../data'
import { parseDpr } from '../dpr/parse'
import { DEFAULT_PREFS, recommend } from '../recommend/recommend'
import { RULES, buildGeminiContext } from './geminiContext'

const report = parseDpr(readFileSync(new URL('../dpr/fixtures/sample-dpr.txt', import.meta.url), 'utf8'))
const accepted = ['DES 200 [01]', 'DES 222 [01]'].map((i) => byId(i)!)
const prefs = { ...DEFAULT_PREFS, onlineOnly: true, skills: 'drawing' }
const rec = recommend(report, CATALOG, prefs)
const ctx = buildGeminiContext({ report, accepted, catalog: SCHEDULABLE, prefs, rec })

describe('buildGeminiContext', () => {
  it('states the rules and the JSON reply contract', () => {
    expect(ctx).toContain(RULES)
    expect(ctx).toContain('"message": string, "add": string[], "remove": string[]')
    expect(ctx).toMatch(/does not enroll anyone/)
  })
  it('includes the student program, taken and in-progress courses', () => {
    expect(ctx).toContain('Visual Communication Design-BS + Computer Science-MN')
    expect(ctx).toMatch(/In progress \(assumed to finish\): .*DES 200/)
    expect(ctx).toMatch(/Completed\/transfer: .*COMM 100TR/)
  })
  it('lists open requirements with their candidate courses', () => {
    expect(ctx).toMatch(/- DES 222 \| Foundation Requirements \| 3 units \| DES 222/)
    expect(ctx).toMatch(/- DES 525 or 527 \|.*\| DES 525, DES 527/)
  })
  it('includes the current schedule, preferences and the last proposal with reasons', () => {
    expect(ctx).toMatch(/- DES 200 \[01\] Visual Design Literacy/)
    expect(ctx).toMatch(/Online only: yes.*Wants to learn: drawing/)
    expect(ctx).toContain('# LAST AUTO-PROPOSAL')
    expect(ctx).toMatch(/Required course/)
  })
  it('marks every catalog section ELIGIBLE, ALREADY-TAKEN or NEEDS <prerequisites>', () => {
    const rows = ctx.split('# CATALOG')[1].split('\n').slice(1).filter(Boolean)
    expect(rows.length).toBe(SCHEDULABLE.length)
    for (const r of rows) expect(r).toMatch(/\| (ELIGIBLE|ALREADY-TAKEN|NEEDS .+?)( \(permission number\))? \|/)
    expect(rows.find((r) => r.startsWith('DES 322 [01]'))).toMatch(/NEEDS DES 222/)
    expect(rows.find((r) => r.startsWith('DES 300 [01]'))).toMatch(/\| ELIGIBLE/)
    expect(rows.find((r) => r.startsWith('DES 200 [01]'))).toMatch(/ALREADY-TAKEN/)
  })
  it('works without a report and without a proposal', () => {
    const bare = buildGeminiContext({ report: null, accepted: [], catalog: SCHEDULABLE.slice(0, 3), prefs: DEFAULT_PREFS, rec: null })
    expect(bare).toMatch(/No degree report was loaded/)
    expect(bare).not.toContain('# LAST AUTO-PROPOSAL')
    expect(bare).toMatch(/Empty\./)
  })
  it('never contains a student name or ID', () => {
    const withPii = parseDpr('Pat Example ID 123456789\n' + readFileSync(new URL('../dpr/fixtures/sample-dpr.txt', import.meta.url), 'utf8'))
    const c = buildGeminiContext({ report: withPii, accepted, catalog: SCHEDULABLE, prefs, rec: null })
    expect(c).not.toMatch(/Pat Example|123456789/)
  })
  it('stays a reasonable size for the model', () => {
    expect(ctx.length).toBeLessThan(80_000)
  })
  it('is deterministic', () => {
    expect(buildGeminiContext({ report, accepted, catalog: SCHEDULABLE, prefs, rec })).toBe(ctx)
  })
})
