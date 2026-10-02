import type { DprReport } from '../dpr/types'

export type ReportField = 'career' | 'program' | 'plans' | 'lastTerm'

export interface ReportRow { key: ReportField; label: string; value: string }

/** Rows shown on the "Review information extracted from your DPR" step (Figma 20:1210). */
export const reportRows = (r: DprReport): ReportRow[] => [
  { key: 'career', label: 'Academic career', value: r.career },
  { key: 'program', label: 'Program', value: r.program },
  { key: 'plans', label: 'Declared major / plan', value: r.plans.join(' + ') },
  { key: 'lastTerm', label: 'Requirement / catalog term', value: r.lastTerm },
]

/** Return a copy of the report with one extracted field corrected by the user. */
export function editReport(r: DprReport, key: ReportField, value: string): DprReport {
  const v = value.trim()
  if (key === 'plans') return { ...r, plans: v ? v.split(/\s*\+\s*/).filter(Boolean) : [] }
  return { ...r, [key]: v }
}
