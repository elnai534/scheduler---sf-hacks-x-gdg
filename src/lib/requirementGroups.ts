import type { DprReport, DprRequirement } from '../dpr/types'
import type { Overrides } from './overrides'
import { EMPTY_LAYOUT, applyLayout } from './layout'
import type { Layout } from './layout'

export interface ReqItem {
  key: string
  /** Id of the report requirement this row comes from (what a manual override targets). */
  reqId: string
  /** Status differs from the report because the student overrode it. */
  manual?: boolean
  /** Added by the student, not from the report. */
  custom?: boolean
  label: string
  status: 'open' | 'filled'
  /** Set on items that still need courses, so the UI can offer them. */
  req?: DprRequirement
  sub?: 'Lower Division' | 'Upper Division'
}
export interface ReqSection { name: string; items: ReqItem[]; done: number }

export const DEGREE_UNITS = 120

/** Already covered by the General Education Upper Division requirements. */
export const UPPER_DIVISION_UNITS = /^Upper-Division Units/i
const HIDDEN = /^(120 Minimum Units|Courses Completed|Residence Units|Upper-Division Units)/i
const CA_GOV = /state and local government|u\.?\s?s\.? (history|government)/i
const CA_NAME = 'CA State and Local Government Requirements'
const CA_ITEMS = ['U.S. History', 'U.S. Government', 'California State and Local Government']
const isUpper = (q: DprRequirement) => /upper/i.test(q.group) || /\b\dUD\b/.test(q.name)

/** Requirement sections for the Plan panel: hides the 120-unit and "Courses Completed" rows and the residence units, splits out the CA government requirement, and splits General Education into Lower/Upper Division. */
export function requirementSections(report: DprReport, overrides: Overrides = {}, layout: Layout = EMPTY_LAYOUT): ReqSection[] {
  const sections: ReqSection[] = []
  const section = (name: string) => {
    let s = sections.find((x) => x.name === name)
    if (!s) sections.push((s = { name, items: [], done: 0 }))
    return s
  }
  for (const q of report.requirements) {
    if (q.status === 'unknown' || HIDDEN.test(q.name) || HIDDEN.test(q.group)) continue
    const status = q.status
    if (CA_GOV.test(q.name)) {
      const s = section(CA_NAME)
      CA_ITEMS.forEach((label, i) => s.items.push({ key: `${q.id}-${i}`, reqId: q.id, manual: q.id in overrides, label, status, req: status === 'open' && i === 0 ? q : undefined }))
      continue
    }
    const name = q.section || 'Requirements'
    const sub = /general education/i.test(name) ? (isUpper(q) ? 'Upper Division' : 'Lower Division') : undefined
    section(name).items.push({ key: q.id, reqId: q.id, manual: q.id in overrides, label: q.name, status, req: status === 'open' ? q : undefined, sub })
  }
  for (const s of sections) s.done = s.items.filter((i) => i.status === 'filled').length
  // CA government sits right after University Requirements
  const ca = sections.findIndex((s) => s.name === CA_NAME)
  const uni = sections.findIndex((s) => /^university/i.test(s.name))
  if (ca >= 0 && uni >= 0 && ca !== uni + 1) sections.splice(uni + 1, 0, ...sections.splice(ca, 1))
  return applyLayout(sections, layout, overrides)
}

/** Units counted toward the 120: courses on the report (completed, transfer, in progress) plus units selected in the schedule. */
export const unitsTowardDegree = (report: DprReport, selectedUnits: number) =>
  report.courses.reduce((n, c) => n + c.units, 0) + selectedUnits
