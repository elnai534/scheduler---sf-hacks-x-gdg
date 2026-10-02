import { conflictsWith } from '../data'
import type { Course } from '../data'
import { eligibility } from '../dag/graph'
import { completedCodes, inProgressCodes } from '../dpr/parse'
import type { DprReport } from '../dpr/types'

/** Plain-language reasons a course may not be addable as-is. Empty = nothing to warn about. */
export function addIssues(course: Course, accepted: Course[], report: DprReport | null): string[] {
  const out: string[] = []
  if (course.permission) out.push('This class needs a permission number from the department. You must get it outside this app.')
  if (report) {
    const done = completedCodes(report)
    const doing = inProgressCodes(report)
    const e = eligibility(course.node, new Set([...done, ...doing]), doing)
    if (!e.ok) out.push(`Missing prerequisite: ${e.unmet.map((g) => g.join(' or ')).join('; ')}.`)
  }
  const clash = accepted.filter((a) => a.code !== course.code && conflictsWith(course, [a]))
  if (clash.length) out.push(`Time conflict with ${clash.map((c) => c.code).join(', ')}.`)
  return out
}
