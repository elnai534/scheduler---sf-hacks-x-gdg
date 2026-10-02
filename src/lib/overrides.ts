import type { DprReport } from '../dpr/types'

/** Manual per-requirement override of what the degree report says. Key = requirement id. */
export type Overrides = Record<string, 'filled' | 'open'>

/** The report with the student's manual overrides applied; everything downstream (Plan tab, recommender) reads this. */
export function applyOverrides(report: DprReport | null, overrides: Overrides): DprReport | null {
  if (!report || !Object.keys(overrides).length) return report
  return {
    ...report,
    requirements: report.requirements.map((q) => {
      const o = overrides[q.id]
      if (!o || o === q.status) return q
      return o === 'filled' ? { ...q, status: 'filled', needed: 0 } : { ...q, status: 'open', needed: Math.max(q.needed, 1) }
    }),
  }
}

/** Toggle: marking the opposite of the report's value sets an override; matching the report clears it. */
export function setOverride(overrides: Overrides, id: string, reportStatus: string, want: 'filled' | 'open'): Overrides {
  const next = { ...overrides }
  if (reportStatus === want) delete next[id]
  else next[id] = want
  return next
}
