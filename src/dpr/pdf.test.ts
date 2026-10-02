import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parseDpr } from './parse.ts'
import { itemsToLines, pdfToText } from './pdf.ts'

// In node the ?url import is a browser path; point the worker at the real file.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href

const pdfFile = (name: string) => new File([readFileSync(new URL(`./fixtures/${name}`, import.meta.url))], name)

describe('itemsToLines', () => {
  it('folds a vertically centred row back together around its course code', () => {
    const lines = itemsToLines([
      { s: 'DES 356', x: 60, y: 700, w: 30 }, { s: 'HISTORY OF DESIGN &', x: 130, y: 704, w: 80 }, { s: 'TECHNOLOGY', x: 130, y: 696, w: 50 },
      { s: '3.00', x: 250, y: 700 }, { s: 'Fall 2026', x: 290, y: 700 },
      { s: 'View All |', x: 250, y: 680 },
    ])
    expect(lines).toEqual(['DES 356 HISTORY OF DESIGN & TECHNOLOGY 3.00 Fall 2026', 'View All |'])
  })
})

// Fixture: a PDF laid out like a browser-printed SF State report (wrapped, vertically centred cells,
// two-line table header, "m/d/yy, h:mm PM" page header, URL footer). Contains no personal data.
describe('pdfToText on a printed-report layout', () => {
  it('parses wrapped table rows, headers and page chrome', async () => {
    const r = parseDpr(await pdfToText(pdfFile('synthetic-dpr.pdf')))
    expect(r.career).toBe('Undergraduate')
    expect(r.plans).toEqual(['Visual Communication Design-BS'])
    const ud = r.requirements.find((q) => q.id === 'R12831/L0060')!
    expect(ud.satisfiedBy.map((c) => [c.code, c.title, c.units, c.grade])).toEqual([
      ['DES 356', 'HISTORY OF DESIGN & TECHNOLOGY', 3, ''],
      ['AIS 460', 'POWER & POLITICS', 3, ''],
      ['ENG 114', 'WRITING THE FIRST YEAR', 3, 'A'],
      ['CINE 200', 'INTRODUCTION TO CINEMA STUDIES', 3, 'A-'],
    ])
    const el = r.requirements.find((q) => q.id === 'R11959/L0020')!
    expect(el.options.map((c) => c.code)).toEqual(['DES 220', 'DES 256', 'CSC 101'])
    expect(el.options[0].title).toBe('INTRO DRAWING FOR DESIGNERS')
    expect(el.optionsTotal).toBe(38)
  })
})
