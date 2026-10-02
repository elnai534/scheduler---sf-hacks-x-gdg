import './withResolvers.ts' // must stay first: pdfjs calls Promise.withResolvers at load time
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

// Run pdfjs in a Vite-bundled worker that polyfills first. (Absent in node/vitest, which sets workerSrc itself.)
if (typeof Worker !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
}

export interface PdfItem { s: string; x: number; y: number; w?: number }

// A table row starts at its course code ("DES 356", "AA S 213", "COMM 100TR") or, for the header, "Course".
const ANCHOR = /^(?:[A-Z]{2,5}(?: [A-Z])? \d{2,3}[A-Z]{0,3}(?:TR)?|Course)(?:\s|$)/
const SAME_LINE = 3
const WORD_GAP = 5

/** Same-baseline items, merged into cells: neighbours closer than a word gap are one cell. */
function toCells(items: PdfItem[]): PdfItem[] {
  const lines: PdfItem[][] = []
  for (const it of items) {
    const l = lines.find((g) => Math.abs(g[0].y - it.y) < SAME_LINE)
    if (l) l.push(it)
    else lines.push([it])
  }
  const cells: PdfItem[] = []
  for (const l of lines) {
    let cur: PdfItem | null = null
    let end = 0
    for (const it of l.sort((p, q) => p.x - q.x)) {
      const t = it.s.trim()
      if (cur && it.x - end <= WORD_GAP) cur.s += ' ' + t
      else { cur = { s: t, x: it.x, y: l[0].y }; cells.push(cur) }
      end = it.x + (it.w ?? 0)
    }
  }
  return cells
}

/**
 * Turn positioned text items from one page into lines the paste parser understands.
 * Table cells are vertically centred against a wrapped description, so a plain "same y" grouping
 * splits one course row into several lines. Instead, every cell within `reach` of a row's course
 * code (and to its right) is folded back into that one row, read column by column.
 */
export function itemsToLines(items: PdfItem[], reach = 7): string[] {
  const cells = toCells(items)
  const anchors = cells.filter((c) => ANCHOR.test(c.s))
  const rowOf = new Map<PdfItem, PdfItem[]>(anchors.map((a) => [a, [a]]))
  const rest: PdfItem[] = []
  for (const c of cells) {
    if (rowOf.has(c)) continue
    let best: PdfItem | null = null
    for (const a of anchors) {
      if (a.x < c.x && Math.abs(a.y - c.y) <= reach && (!best || Math.abs(a.y - c.y) < Math.abs(best.y - c.y))) best = a
    }
    if (best) rowOf.get(best)!.push(c)
    else rest.push(c)
  }

  const out: { y: number; text: string }[] = []
  for (const [a, row] of rowOf) {
    // Group cells into columns by left edge, then read each column top to bottom.
    const cols: PdfItem[][] = []
    for (const c of [...row].sort((p, q) => p.x - q.x)) {
      const col = cols.find((g) => Math.abs(g[0].x - c.x) <= 2)
      if (col) col.push(c)
      else cols.push([c])
    }
    out.push({ y: a.y, text: cols.map((g) => g.sort((p, q) => q.y - p.y).map((c) => c.s).join(' ')).join(' ') })
  }
  const bands: { y: number; parts: PdfItem[] }[] = []
  for (const c of rest) {
    const b = bands.find((r) => Math.abs(r.y - c.y) < SAME_LINE)
    if (b) b.parts.push(c)
    else bands.push({ y: c.y, parts: [c] })
  }
  for (const b of bands) out.push({ y: b.y, text: b.parts.sort((p, q) => p.x - q.x).map((p) => p.s).join(' ') })

  return out.sort((p, q) => q.y - p.y).map((r) => r.text.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** Extract text from a PDF, one line per visual row, so parseDpr sees the same shape as pasted text. */
export async function pdfToText(file: File): Promise<string> {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const lines: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const width = page.view[2] - page.view[0]
    const content = await page.getTextContent()
    const items: PdfItem[] = []
    for (const it of content.items) {
      if ('str' in it && it.str.trim()) items.push({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width })
    }
    lines.push(...itemsToLines(items, 7 * (width / 612)))
  }
  return lines.join('\n')
}
