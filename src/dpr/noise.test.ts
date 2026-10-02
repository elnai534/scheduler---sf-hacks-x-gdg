import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseDpr } from './parse.ts'

const sample = readFileSync(new URL('./fixtures/sample-dpr.txt', import.meta.url), 'utf8')
const clean = parseDpr(sample)
const sig = (r: ReturnType<typeof parseDpr>) => JSON.stringify(r.requirements.map((q) => [q.id, q.name, q.group, q.section, q.status, q.needed, q.satisfiedBy.map((c) => c.code), q.options.map((c) => c.code)]))

// Printed-page noise from the real PDF: repeating page header/footer lines between any two lines.
const header = 'My Academic Requirements 2026-10-02, 11:53 AM'
const footer = 'https://cmsweb.sfsu.edu/psc/CSFPRDS/EMPLOYEE/SA/c/CSU_FAC_…929&INSTITUTION=SFCMP&OPRID=000000000&SAA_CAREER_RPT=UGRD Page 7 of 20'
const withNoise = (every: number) => sample.split('\n').flatMap((l, i) => (i > 0 && i % every === 0 ? [footer, header, l] : [l])).join('\n')

describe('real-world paste noise', () => {
  for (const every of [7, 23, 41]) {
    it(`page headers/footers every ${every} lines do not change the result`, () => {
      expect(sig(parseDpr(withNoise(every)))).toBe(sig(clean))
    })
  }
  it('noise inside a course table does not corrupt its rows', () => {
    const r = parseDpr(sample.replace('DES 225 ', 'DES 225 ').replace(/^(DES 220 INTRO DRAWING FOR)$/m, `${footer}\n${header}\n$1`))
    const electives = r.requirements.find((q) => q.id === 'R11959/L0020')!
    expect(electives.options.map((o) => o.code)).toContain('DES 220')
    expect(electives.options.find((o) => o.code === 'DES 220')!.title).toBe('INTRO DRAWING FOR DESIGNERS')
  })
  it('extra blank lines and leading/trailing spaces are harmless', () => {
    const spaced = sample.split('\n').map((l) => `  ${l}   \n`).join('\n')
    expect(sig(parseDpr(spaced))).toBe(sig(clean))
  })
  it('a leading-space heading style (as in the PDF text) parses the same', () => {
    const lead = sample.replace(/^(Area .*|Minimum .*|Core Requirements|Foundation Requirements)$/gm, ' $1 ')
    expect(sig(parseDpr(lead))).toBe(sig(clean))
  })
})
