import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseDpr } from './parse.ts'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pdfToText } from './pdf.ts'

// In node the ?url import is a browser path; point the worker at the real file.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href

const pdf = process.env.DPR_PDF
describe.skipIf(!pdf || !existsSync(pdf))('pdfToText', () => {
  it('parses to the same requirements as the source text', async () => {
    const buf = readFileSync(pdf!)
    const text = await pdfToText(new File([buf], 'dpr.pdf'))
    const want = parseDpr(readFileSync('src/dpr/fixtures/sample-dpr.txt', 'utf8'))
    expect(parseDpr(text).requirements.length).toBe(want.requirements.length)
  })
})
