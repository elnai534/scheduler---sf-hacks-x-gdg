import type { Course } from '../data'
import { cid, countConflicts, range } from '../data'
import { eligibility } from '../dag/graph'
import { completedCodes, inProgressCodes, openRequirements } from '../dpr/parse'
import type { DprReport } from '../dpr/types'
import type { Prefs, Recommendation } from '../recommend/recommend'

interface Input {
  report: DprReport | null
  accepted: Course[]
  /** Sections the student can actually be scheduled into. */
  catalog: Course[]
  prefs: Prefs
  rec: Recommendation | null
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const days = (c: Course) => (c.meetings.length ? [...new Set(c.meetings.map((m) => m.day))].join('/') : 'no set days')

export const RULES = [
  'You are the scheduling assistant inside "SF State Schedule Studio", a course PLANNING tool. It does not enroll anyone; never claim to.',
  'Reply ONLY as JSON: {"message": string, "add": string[], "remove": string[]}. "message" is short and cites concrete facts (days, mode, seats, prerequisites, requirement names). "add"/"remove" hold section ids exactly as written in the CATALOG (e.g. "DES 300 [01]").',
  'Only add a section if its status is ELIGIBLE, it fits the units target, and it does not overlap another accepted section. If the student asks for something not allowed, explain why in "message" and leave "add" empty.',
  'Days, modes, seat counts and times are SAMPLE data, not real SF State availability; say so if asked about availability. Course status in the report is inferred from pasted text, so remaining requirements need advisor verification.',
  'Prefer filling still-open requirements. Respect the student\'s preferences below unless they ask you to change them.',
].join('\n')

/** Everything the app has learned about this student and catalog, as compact text for the model. */
export function buildGeminiContext({ report, accepted, catalog, prefs, rec }: Input): string {
  const out: string[] = ['# RULES', RULES]

  const done = report ? completedCodes(report) : new Set<string>()
  const doing = report ? inProgressCodes(report) : new Set<string>()
  const assumed = new Set([...done, ...doing]) // in-progress courses are assumed to finish

  out.push('', '# STUDENT')
  if (report) {
    out.push(`Program: ${report.plans.join(' + ') || report.program}. Career: ${report.career}. Current term: ${report.lastTerm}.`)
    out.push(`Completed/transfer: ${[...done].join(', ') || 'none listed'}.`)
    out.push(`In progress (assumed to finish): ${[...doing].join(', ') || 'none'}.`)
    const open = openRequirements(report)
    out.push('', '# OPEN REQUIREMENTS (name | group | still needed | candidate courses)')
    for (const q of open) {
      out.push(`- ${q.name} | ${q.group || q.section} | ${q.needed} ${q.kind === 'courses' ? 'course' : 'units'} | ${q.options.length ? q.options.map((o) => o.code).join(', ') : 'no course list on report'}`)
    }
    if (report.warnings.length) out.push('', 'Report caveats: ' + report.warnings.join(' '))
  } else {
    out.push('No degree report was loaded; recommendations are not tied to requirements.')
  }

  out.push('', '# CURRENT SCHEDULE')
  if (!accepted.length) out.push('Empty.')
  for (const c of accepted) out.push(`- ${cid(c)} ${c.title} | ${c.units}u | ${c.mode} | ${days(c)}${c.meetings[0] ? ' ' + range(c.meetings[0].start, c.meetings[0].end) : ''}`)
  out.push(`Total ${accepted.reduce((n, c) => n + c.units, 0)} units; ${countConflicts(accepted)} time conflicts.`)

  out.push('', '# PREFERENCES')
  out.push(`Target units: ${prefs.targetUnits || 'not set'}. Online only: ${prefs.onlineOnly ? 'yes' : 'no'}. Allowed days: ${prefs.days.length ? prefs.days.join(', ') : 'any'}. Seats available only: ${prefs.seatsOnly ? 'yes' : 'no'}. Graduate fast: ${prefs.fast ? 'yes' : 'no'}. Wants to learn: ${prefs.skills.trim() || 'not specified'}.`)

  if (rec) {
    out.push('', '# LAST AUTO-PROPOSAL (from the Plan tab)')
    for (const p of rec.picks) out.push(`- ${cid(p.section)} for ${p.requirement}: ${p.reasons.join('; ')}`)
    for (const u of rec.uncovered) out.push(`- Not covered: ${u.requirement} (${u.why})`)
    for (const b of rec.blockedInterests) out.push(`- Interest match blocked: ${b.code} ${b.title} needs ${b.needs}`)
  }

  const fills = new Map<string, string[]>()
  if (report) for (const q of openRequirements(report)) for (const o of q.options) fills.set(o.code, [...(fills.get(o.code) ?? []), q.name])
  out.push('', '# CATALOG (id | title | units | mode | days | seats | status | fills | about)')
  for (const c of catalog) {
    const el = eligibility(c.node, assumed, doing)
    const have = assumed.has(c.code)
    const status = have ? 'ALREADY-TAKEN' : el.ok ? 'ELIGIBLE' : `NEEDS ${el.unmet.map((g) => g.join(' or ')).join(' and ')}`
    out.push(`${cid(c)} | ${c.title} | ${c.units}u | ${c.mode} | ${days(c)} | seats ${c.seats} | ${status}${c.permission ? ' (permission number)' : ''} | ${(fills.get(c.code) ?? []).join(', ') || '-'} | ${clip(c.description, 110)}`)
  }
  return out.join('\n')
}
