import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATALOG, SCHEDULABLE, byId, isOnline } from '../data'
import { parseDpr } from '../dpr/parse'
import { DEFAULT_PREFS } from '../recommend/recommend'
import { answerLocally } from './localAnswers'
import { runTool, statusOf } from './geminiTools'
import type { ToolEnv } from './geminiTools'

const report = parseDpr(readFileSync(new URL('../dpr/fixtures/sample-dpr.txt', import.meta.url), 'utf8'))
const env: ToolEnv = { report, accepted: [byId('DES 200 [01]')!], schedulable: SCHEDULABLE, all: CATALOG, prefs: DEFAULT_PREFS }
const ask = (q: string, e: ToolEnv = env) => answerLocally(q, e)

describe('eligibility questions come straight from the graph', () => {
  it('eligible course: says eligible, never "requires prerequisites"', () => {
    const a = ask('Can I take DES 300?')!
    expect(a).toMatch(/^DES 300: eligible\./)
    expect(a).not.toMatch(/not eligible|needs/i)
    expect(a).toMatch(/DES 300 \[01\]/)
    expect(a).toMatch(/Check restrictions/) // DES 300 is restricted to design majors
  })
  it('ineligible course: names exactly what is missing', () => {
    expect(ask('Am I eligible for DES 322?')).toMatch(/^DES 322: not eligible yet\. Needs DES 222\./)
    expect(ask('Do I meet the prerequisites for CSC 230?')).toMatch(/not eligible yet\. Needs CSC 210 or CSC 215 or ENGR 213 and MATH 227/)
  })
  it('course already on the report', () => {
    expect(ask('Can I take DES 200?')).toBe('DES 200: already on your report.')
  })
  it('handles lowercase, no space, and several courses', () => {
    expect(ask('can i take des300')).toMatch(/^DES 300: eligible/)
    const two = ask('Am I eligible for DES 300 and DES 322?')!
    expect(two).toMatch(/DES 300: eligible/)
    expect(two).toMatch(/DES 322: not eligible yet/)
  })
  it('ignores things that only look like course codes, and unknown subjects', () => {
    expect(ask('Can I take XYZ 123?')).toBeNull()
    expect(ask('can i take 12 units in fall')).toBeNull()
  })
})

describe('"what can I take" lists only eligible, matching sections', () => {
  const ids = (a: string) => [...a.matchAll(/^- (\S+ \S+ \[\d+\])/gm)].map((m) => m[1].replace(/ (?=\[)/, ' '))
  const byRow = (a: string) => ids(a).map((x) => byId(x.replace(/^(\S+) (\S+) /, '$1 $2 '))!).filter(Boolean)
  it('lists only sections whose status is eligible and not taken', () => {
    const a = ask('What can I take?')!
    const rows = byRow(a)
    expect(rows.length).toBeGreaterThan(0)
    for (const c of rows) expect(statusOf(c.code, env)).toBe('eligible')
    expect(a).not.toMatch(/CSC 230 \[01\]/) // needs prerequisites
    expect(a).not.toMatch(/DES 200 \[01\]/) // already taken
  })
  it('online filter', () => {
    const a = ask('What can I take online?')!
    expect(a).toMatch(/^Eligible now \(online\)/)
    for (const c of byRow(a)) expect(isOnline(c.mode)).toBe(true)
  })
  it('day filter', () => {
    const a = ask('Which classes are open on Tuesdays and Thursdays?')!
    for (const c of byRow(a)) for (const m of c.meetings) expect(['Tue', 'Thu']).toContain(m.day)
  })
  it('open-seats filter', () => {
    for (const c of byRow(ask('what online classes with open seats can I take')!)) expect(c.seats).toBeGreaterThan(0)
  })
  it('puts sections that fill an open requirement first and says so', () => {
    const a = ask('What can I take?')!
    expect(a.split('\n')[1]).toMatch(/fills /)
  })
  it('without a report it says so and nothing counts as taken', () => {
    expect(ask('What can I take?', { ...env, report: null })).toMatch(/No degree report loaded/)
  })
})

describe('"what do I still need"', () => {
  it('lists open requirements from the report', () => {
    const a = ask('What do I still need to graduate?')!
    expect(a).toMatch(/^Open requirements: \d+\./)
    expect(a).toMatch(/- DES 222 \(Foundation Requirements\)/)
    expect(a).toMatch(/Major Electives/)
  })
  it('says so when there is no report', () => {
    expect(ask('what do I still need', { ...env, report: null })).toMatch(/No degree report loaded/)
  })
})

describe('everything else goes to the model', () => {
  it('returns null for changes, planning and open-ended questions', () => {
    for (const q of ['Add DES 300 please', 'Remove DES 222', 'Recommend a schedule', 'Swap DES 220 for something online', 'Keep me off campus on Fridays', 'Which is the easiest design class?', 'Explain what GWAR is']) expect(ask(q), q).toBeNull()
  })
})

describe('consistency: local answers never disagree with the graph tools', () => {
  it('for every DES and CSC course the eligibility answer matches get_course', () => {
    const codes = [...new Set(SCHEDULABLE.map((c) => c.code))].slice(0, 80)
    for (const code of codes) {
      const a = ask(`Can I take ${code}?`)!
      const tool = (runTool('get_course', { code }, env) as { status: string }).status
      if (tool === 'eligible') expect(a, code).toMatch(new RegExp(`^${code}: eligible`))
      else if (tool === 'taken or in progress') expect(a, code).toBe(`${code}: already on your report.`)
      else expect(a, code).toMatch(new RegExp(`^${code}: not eligible yet\\. ${tool.replace(/^needs/, 'Needs').replace(/[()]/g, '\\$&')}`))
    }
  })
})
