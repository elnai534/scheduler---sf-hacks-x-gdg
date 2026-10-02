import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Extract plain text from a PDF, one line per visual row, so parseDpr sees the same shape as pasted text.
export async function pdfToText(file: File): Promise<string> {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const lines: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    const rows: { y: number; parts: { x: number; s: string }[] }[] = []
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue
      const x = it.transform[4]
      const y = it.transform[5]
      const row = rows.find((r) => Math.abs(r.y - y) < 3)
      if (row) row.parts.push({ x, s: it.str })
      else rows.push({ y, parts: [{ x, s: it.str }] })
    }
    rows.sort((a, b) => b.y - a.y)
    for (const r of rows) lines.push(r.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' ').replace(/\s+/g, ' ').trim())
  }
  return lines.join('\n')
}
