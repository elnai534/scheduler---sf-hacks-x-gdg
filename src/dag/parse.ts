import type { CourseNode, PrereqGroup } from './types.ts'

const CODE = String.raw`[A-Z]{2,5} \d{2,3}[A-Z]{0,3}`
const CODE_G = new RegExp(`\\b${CODE}\\b`, 'g')
const CONCURRENT_MARK = new RegExp(`(${CODE})\\s*\\*?\\s*\\(may be taken concurrently\\)`, 'g')
const COREQ = new RegExp(`concurrent(?:ly)? enroll(?:ment|ed)? in ((?:${CODE})(?:(?:,|,? and|,? or)\\s*(?:${CODE}))*)`, 'i')

const codesIn = (s: string) => s.match(CODE_G) ?? []
const uniq = <T>(a: T[]) => [...new Set(a)]
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

export interface PrereqParse {
  prereqGroups: PrereqGroup[]
  coreqs: string[]
  concurrentOk: string[]
  notes: string[]
  permissionWaiver: boolean
}

export function parsePrereqText(raw: string): PrereqParse {
  let t = clean(raw)
  const permissionWaiver = /permission of (?:the )?instructor/i.test(t)
  const concurrentOk: string[] = []
  t = t.replace(CONCURRENT_MARK, (_m, c: string) => { concurrentOk.push(c); return c })
  t = t
    .replace(/\s*with (?:a )?grades? of [A-D][+-]? or better/gi, '')
    .replace(/,?\s*or equivalent/gi, '')
    .replace(/\*/g, '')
    .replace(/[.\s]+$/, '')

  const groups: PrereqGroup[] = []
  const coreqs: string[] = []
  const notes: string[] = []
  let prevSegGroups: PrereqGroup[] = []

  for (let seg of t.split(/;\s*/)) {
    seg = clean(seg)
    if (!seg) continue
    const m = COREQ.exec(seg)
    if (m) {
      const rest = clean(seg.replace(COREQ, '').replace(/\b(?:is )?recommended\b/i, ''))
      if (/recommended/i.test(seg)) notes.push(seg)
      else coreqs.push(...codesIn(m[1]))
      seg = rest
      if (!seg || /^[,.\s]*$/.test(seg)) continue
    }
    if (codesIn(seg).length === 0) {
      // "; or permission of the instructor" is an alternative to the previous segment's groups
      if (/^or\s+/i.test(seg) && prevSegGroups.length) {
        for (const g of prevSegGroups) g.alt.push(seg.replace(/^or\s+/i, ''))
      } else notes.push(seg)
      continue
    }
    const entries: { codes: string[]; alt: string[] }[] = []
    for (const piece of seg.split(/,\s*(?:and\s+)?|\s+and\s+/)) {
      const p = clean(piece)
      if (!p) continue
      const leadingOr = /^or\s+/i.test(p)
      const body = p.replace(/^or\s+/i, '')
      const pieceCodes = codesIn(body)
      let codes: string[] = []
      let alt: string[] = []
      if (pieceCodes.length) {
        for (const a of body.split(/\s+or\s+/)) (codesIn(a).length ? codes.push(...codesIn(a)) : alt.push(a.trim()))
      } else alt = [body]
      codes = uniq(codes)
      const last = entries[entries.length - 1]
      if (leadingOr && last) {
        last.codes = uniq([...last.codes, ...codes])
        last.alt.push(...alt)
      } else entries.push({ codes, alt })
    }
    prevSegGroups = []
    for (const e of entries) {
      if (e.codes.length) {
        const g = { anyOf: e.codes, alt: e.alt }
        groups.push(g)
        prevSegGroups.push(g)
      } else notes.push(...e.alt)
    }
  }
  const strict = (c: string) => !concurrentOk.includes(c)
  const outGroups = groups
    .map((g) => ({ ...g, anyOf: g.anyOf.filter(strict) }))
    .filter((g) => g.anyOf.length > 0)
  return { prereqGroups: outGroups, coreqs: uniq(coreqs), concurrentOk: uniq(concurrentOk), notes, permissionWaiver }
}

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8203;|&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()

export function parseBulletinHtml(html: string): CourseNode[] {
  const out: CourseNode[] = []
  const blocks = html.split('class="courseblock"').slice(1)
  for (const b of blocks) {
    const title = /<p class="courseblocktitle">(.*?)<\/p>/s.exec(b)
    if (!title) continue
    const tm = /^(.+?)\s+(.*?)\s*\(Units?:\s*([\d.\-–]+)\)$/.exec(decode(title[1]))
    const tm2 = tm ?? new RegExp(`^(${CODE})\\s+(.*)$`).exec(decode(title[1]))
    if (!tm2) continue
    let code = tm2[1]
    const m = /^([A-Z]{2,5})\s+(\d{2,3}[A-Z]{0,3})/.exec(decode(title[1]))
    if (m) code = `${m[1]} ${m[2]}`
    const name = decode(title[1]).replace(new RegExp(`^${code}\\s+`), '').replace(/\s*\(Units?:.*\)$/, '')
    const unitsM = /\(Units?:\s*([\d.]+)/.exec(decode(title[1]))
    let prereqText = ''
    for (const x of b.matchAll(/<p class="courseblockextra">(.*?)<\/p>/gs)) {
      const line = decode(x[1])
      const pm = /^Prerequisites?:\s*(.*)$/.exec(line)
      if (pm) { prereqText = pm[1]; break }
    }
    const body = b.replace(/<p class="courseblocktitle">.*?<\/p>/s, '').replace(/<p class="courseblockextra">.*?<\/p>/gs, '')
    const description = decode(body.split('</div>')[0].replace(/^[^<]*>/, ''))
    const parsed = parsePrereqText(prereqText)
    out.push({ code, title: name, units: unitsM ? Number(unitsM[1]) : null, prereqText, description, ...parsed })
  }
  return out
}
