import type { CourseStatus, DprCourse, DprReport, DprRequirement } from './types.ts'

const SUBJECT = String.raw`[A-Z]{2,5}(?: [A-Z])?`
const CODE = String.raw`${SUBJECT} \d{2,3}[A-Z]{0,3}(?:TR)?`
const ROW_START = new RegExp(`^(${CODE})\\s+\\S`)
const ROW_FULL = new RegExp(`^(${CODE})\\s+(.+?)\\s+(\\d+\\.\\d\\d)(?:\\s+(.*))?$`)
const TAG = /^\[([RG]\d+)(?:\s*\/\s*(L\d+))?\]$/
const TERM = /^(Fall|Spring|Summer|Winter) \d{4}/
const NOT_HEADING = /^(Units Required|Total Units Required|Note:|Complete |One course|Refer to|A minimum|The University|All courses|This area|Student |If you|Course Description|View |Units:|Courses:|GPA:|The following|To earn|Important|Undergraduate Degree|College of|1\.|2\.|3\.|Planned|Requirement \(|Career:|Program:|Plan:|Graduation$|Status:|Not Applied|Current Academic|Last Term|General Information|Helpful|San Francisco)/
/** Printed-page chrome: repeating header, URL/page footer, timestamps. Must never become a heading or table row. */
const PAGE_NOISE = /^(My Academic Requirements\b|\d{1,2}\/\d{1,2}\/\d{2,4},? \d{1,2}:\d{2}\s*[AP]M\b|https?:\/\/\S+|.*\bPage \d+ of \d+$|\d{4}-\d{2}-\d{2},? \d{1,2}:\d{2}\s*[AP]M$|Go to top$)/
const SKIP_TABLE = /^(Course Description|Designation Status|View Course List)/

const num = (s: string) => Number(s.replace(/,/g, ''))

function parseRow(buf: string, kind: 'used' | 'options', lastTerm: string): DprCourse | null {
  const m = ROW_FULL.exec(buf.replace(/\s+/g, ' ').trim())
  if (!m) return null
  const tail = (m[4] ?? '').trim()
  const code = m[1]
  const base = { code, title: m[2].trim(), units: num(m[3]) }
  const termM = TERM.exec(tail)
  if (kind === 'options' && !termM) {
    return { ...base, when: tail, grade: '', status: 'candidate' }
  }
  const rest = termM ? tail.slice(termM[0].length).trim() : tail
  const gradeM = /^(T|CR|NC|W|I|IP|[A-D][+-]?)(?:\s|$)/.exec(rest)
  const grade = gradeM ? gradeM[1] : ''
  let status: CourseStatus
  if (grade === 'T' || /TR$/.test(code)) status = 'transfer'
  else if (grade && grade !== 'IP' && grade !== 'W' && grade !== 'I') status = 'completed'
  else status = termM && termM[0] === lastTerm ? 'inProgress' : 'unknown'
  return { ...base, when: termM ? termM[0] : tail, grade, status }
}

export function parseDpr(text: string): DprReport {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !PAGE_NOISE.test(l))
  const report: DprReport = { career: '', program: '', plans: [], lastTerm: '', requirements: [], courses: [], warnings: [] }
  const lt = /Last Term Registered:\s*((?:Fall|Spring|Summer|Winter) \d{4})/.exec(text)
  if (lt) report.lastTerm = lt[1]

  let section = ''
  const groups = new Map<string, string>()
  /** "3 Units (2.68 converted quarter units)": the report's Units line carries the quarter figure; we show semester units. */
  let conv: { sem: number; quarter: number } | null = null
  let target: { required: number; taken: number; needed: number; kind: DprRequirement['kind'] } | null = null
  let req: DprRequirement | null = null
  let pendingHeading = ''
  let pendingNotes: string[] = []
  let inNote = false
  let table: { kind: 'used' | 'options'; rows: string[] } | null = null

  const flushTable = (total: number | null) => {
    if (!table || !req) { table = null; return }
    for (const buf of table.rows) {
      const c = parseRow(buf, table.kind, report.lastTerm)
      if (!c) continue
      if (c.status === 'candidate') req.options.push(c)
      else req.satisfiedBy.push(c)
    }
    if (table.kind === 'options' && total !== null) req.optionsTotal = total
    table = null
  }

  for (const line of lines) {
    if (table) {
      const va = /^View All \|\s*First\s+\d+(?:-(\d+))? of (\d+)/.exec(line)
      if (va) {
        const shownEnd = va[1] ? num(va[1]) : 1
        const total = num(va[2])
        const kind = table.kind
        flushTable(kind === 'options' ? total : null)
        if (req && shownEnd < total) report.warnings.push(`${req.name}: the report lists ${total} courses but only ${shownEnd} were pasted. Click "View All" on the report and paste again.`)
        continue
      }
      if (SKIP_TABLE.test(line)) continue
      if (ROW_START.test(line) || table.rows.length === 0) table.rows.push(line)
      else table.rows[table.rows.length - 1] += ' ' + line
      continue
    }
    const prog = /^(Career|Program|Plan):\s*(.+?)\s+(?:Fall|Spring|Summer|Winter) \d{4}(?:\s|$)/.exec(line)
    if (prog) {
      if (prog[1] === 'Career') report.career = prog[2]
      else if (prog[1] === 'Program') report.program = prog[2]
      else report.plans.push(prog[2])
      continue
    }
    if (/^The following courses (were used|may be used) to satisfy this requirement:/.test(line)) {
      table = { kind: line.includes('were used') ? 'used' : 'options', rows: [] }
      continue
    }
    // Advising-only list of dropped/withdrawn courses: not part of any requirement, so don't attach it to the previous one.
    if (line === 'Courses Not Used') { req = null; target = null; continue }
    const tag = TAG.exec(line)
    if (tag) {
      const [, rid, lid] = tag
      const name = pendingHeading || rid
      if (rid.startsWith('G')) {
        section = name
        groups.set(rid, name)
        req = null
        target = null
      } else if (!lid) {
        groups.set(rid, name)
        req = null
        target = null
      } else {
        req = {
          id: `${rid}/${lid}`, name, group: groups.get(rid) ?? '', section, kind: null, required: 0, taken: 0, needed: 0,
          status: 'unknown', satisfiedBy: [], options: [], optionsTotal: null, notes: pendingNotes,
        }
        report.requirements.push(req)
        target = req
      }
      pendingHeading = ''
      pendingNotes = []
      inNote = false
      continue
    }
    const cv = /(\d+(?:\.\d+)?)\s+Units?\s*\((\d+(?:\.\d+)?)\s+converted quarter units\)/i.exec(line)
    if (cv) conv = { sem: Number(cv[1]), quarter: Number(cv[2]) }
    const amt = /^(Units|Courses|GPA):\s*([\d.,]+) required,\s*([\d.,]+) (?:taken|actual)(?:,\s*([\d.,]+) needed)?/.exec(line)
    if (amt && target) {
      target.kind = amt[1] === 'Units' ? 'units' : amt[1] === 'Courses' ? 'courses' : 'gpa'
      target.required = num(amt[2])
      target.taken = num(amt[3])
      target.needed = amt[4] !== undefined ? num(amt[4]) : Math.max(0, target.required - target.taken)
      if (amt[1] === 'Units' && conv && Math.abs(target.required - conv.quarter) < 0.01) {
        target.required = conv.sem
        target.needed = Math.max(0, conv.sem - target.taken)
      }
      conv = null
      continue
    }
    if (line.startsWith('Note:')) { pendingNotes.push(line.replace(/^Note:\s*/, '')); inNote = !line.endsWith('.'); continue }
    if (inNote) { pendingNotes[pendingNotes.length - 1] += ' ' + line; inNote = !line.endsWith('.'); continue }
    if (/^[A-Z0-9]/.test(line) && line.length <= 90 && !line.endsWith('.') && !NOT_HEADING.test(line) && !ROW_FULL.test(line)) {
      pendingHeading = line
    }
  }
  flushTable(null)

  for (const r of report.requirements) {
    const open = r.kind !== null && r.kind !== 'gpa' && r.needed > 0
    if (open) r.status = 'open'
    else if (r.satisfiedBy.length) r.status = 'filled'
  }

  // Distinct courses the student holds. Transfer credits come only from the report's own
  // "Courses Completed / In-Progress" list (they also repeat inside GE requirements).
  const master = report.requirements.find((r) => /^Courses Completed \/ In-Progress$/.test(r.name))
  const seen = new Set<string>()
  const add = (c: DprCourse) => { report.courses.push(c) }
  for (const c of master?.satisfiedBy ?? []) add(c)
  for (const r of report.requirements) {
    if (r === master) continue
    for (const c of r.satisfiedBy) {
      if (c.status === 'transfer' && master) continue
      if (seen.has(c.code) || report.courses.some((x) => x.code === c.code && x.status !== 'transfer')) continue
      seen.add(c.code)
      add(c)
    }
  }
  return report
}

/** Codes the prerequisite graph should treat as done (completed or transferred). */
export const completedCodes = (r: DprReport) => new Set(r.courses.filter((c) => c.status === 'completed' || c.status === 'transfer').map((c) => c.code))
/** Codes the student is taking now (count as "in progress" for concurrent-allowed prerequisites). */
export const inProgressCodes = (r: DprReport) => new Set(r.courses.filter((c) => c.status === 'inProgress').map((c) => c.code))
export const openRequirements = (r: DprReport) => r.requirements.filter((q) => q.status === 'open')
