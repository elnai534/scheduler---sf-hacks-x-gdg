import type { Course, Day } from '../data'
import { cid, isOnline, range } from '../data'
import { openRequirements } from '../dpr/parse'
import { COURSE_CODE } from './geminiGuard'
import { statusOf } from './geminiTools'
import type { ToolEnv } from './geminiTools'

/**
 * Questions where a wrong sentence would mislead ("can I take X", "what can I take", "what do I still need") are answered
 * straight from the prerequisite graph and the report. No model call, so they are always consistent with the data and use no quota.
 * Returns null when the question is something else (adding, planning, explaining), which goes to the model.
 */

const CHANGE = /\b(add|remove|drop|swap|replace|put|build|generate|recommend|suggest|make me|plan my|schedule me|fit)\b/i
const ELIG = /\b(eligible|eligibility|can i take|could i take|can i enrol\w*|am i able|do i (meet|have|qualify)|prereq\w*|pre-req\w*|need before|requirements? for|allowed to take|ready for|take .* yet)\b/i
const LIST = /(\b(what|which)\b.*\b(can|could|should|do)\b.*\bi\b.*\b(take|register|enrol\w*|sign up)|\b(what|which)\b.*\b(classes|courses|sections)\b.*\b(open|available|eligible)|\beligible (classes|courses|sections)\b|\bwhat('s| is) (open|available)\b)/i
const NEED = /(\bremaining (requirements?|courses|classes)\b|\b(what|which)\b.*\b(do i|am i|i)\b.*\b(still|left|else)?\b.*\b(need|missing|require\w*)\b|\bwhat('s| is) left\b|\bstill (need|have) to\b)/i

const DAY_WORDS: [RegExp, Day][] = [[/\bmon(day)?s?\b/i, 'Mon'], [/\btue(s|sday)?s?\b/i, 'Tue'], [/\bwed(nesday)?s?\b/i, 'Wed'], [/\bthu(r|rs|rsday)?s?\b|\bthursday/i, 'Thu'], [/\bfri(day)?s?\b/i, 'Fri']]

const subjectsOf = (env: ToolEnv) => new Set(env.all.map((c) => c.code.split(' ')[0]))

function codesIn(q: string, env: ToolEnv): string[] {
  const known = subjectsOf(env)
  const out: string[] = []
  for (const m of q.matchAll(/\b([A-Za-z]{2,5}) ?(\d{2,3}[A-Za-z]{0,3})\b/g)) {
    const code = `${m[1].toUpperCase()} ${m[2].toUpperCase()}`
    if (known.has(m[1].toUpperCase()) && COURSE_CODE.test(code) && !out.includes(code)) out.push(code)
  }
  return out
}

const days = (c: Course) => (c.meetings.length ? [...new Set(c.meetings.map((m) => m.day))].join('/') : 'no set days')
const row = (c: Course) => `${cid(c)} · ${c.title} · ${c.units}u · ${c.mode}${c.meetings.length ? ` · ${days(c)} ${range(c.meetings[0].start, c.meetings[0].end)}` : ''} · ${c.mode === 'Catalog only' ? 'no seat data' : `${c.seats} seats`}`

function eligibilityAnswer(codes: string[], env: ToolEnv): string {
  return codes.slice(0, 3).map((code) => {
    const st = statusOf(code, env)
    const secs = env.schedulable.filter((c) => c.code === code).slice(0, 3)
    const where = secs.length ? `\n${secs.map((c) => `  ${row(c)}`).join('\n')}` : ''
    if (st === 'taken or in progress') return `${code}: already on your report.`
    if (st === 'not in the catalog') return `${code}: not in the catalog.`
    if (st === 'eligible') {
      const node = env.all.find((c) => c.code === code)?.node
      const caveat = node && (node.notes.length || node.permissionWaiver) ? ` Check restrictions: ${node.notes[0] ?? 'permission of the instructor may be required'}.` : ''
      return `${code}: eligible. Prerequisites are met (courses in progress count as done).${caveat}${where}`
    }
    return `${code}: not eligible yet. ${st.replace(/^needs/, 'Needs')}.${where ? `\nSections:${where}` : ''}`
  }).join('\n\n')
}

function listAnswer(q: string, env: ToolEnv): string {
  const wantOnline = /\bonline|remote|async\w*/i.test(q)
  const wantDays = DAY_WORDS.filter(([re]) => re.test(q)).map(([, d]) => d)
  const wantSeats = /\bseats?\b|\bopen sections?\b/i.test(q)
  const fills = new Map<string, string[]>()
  if (env.report) for (const r of openRequirements(env.report)) for (const o of r.options) fills.set(o.code, [...(fills.get(o.code) ?? []), r.name])
  const rows = env.schedulable
    .filter((c) => statusOf(c.code, env) === 'eligible')
    .filter((c) => (!wantOnline || isOnline(c.mode)) && (!wantDays.length || c.meetings.every((m) => wantDays.includes(m.day))) && (!wantSeats || c.seats > 0))
    .sort((a, b) => Number(fills.has(b.code)) - Number(fills.has(a.code)) || cid(a).localeCompare(cid(b)))
  const filters = [wantOnline && 'online', wantDays.length && `only ${wantDays.join('/')}`, wantSeats && 'with open seats'].filter(Boolean).join(', ')
  const head = `Eligible now${filters ? ` (${filters})` : ''}: ${rows.length} section${rows.length === 1 ? '' : 's'}.`
  const lines = rows.slice(0, 8).map((c) => `- ${row(c)}${fills.has(c.code) ? ` · fills ${[...new Set(fills.get(c.code))].join(', ')}` : ''}`)
  const more = rows.length > 8 ? `\n…and ${rows.length - 8} more.` : ''
  const note = `${env.report ? '' : 'No degree report loaded, so nothing counts as taken. '}Eligible means prerequisites are met. Days, modes and seats are sample data.`
  return [head, ...lines].join('\n') + more + '\n' + note
}

function needAnswer(env: ToolEnv): string {
  if (!env.report) return 'No degree report loaded. Add one on Program setup to see what you still need.'
  const open = openRequirements(env.report)
  if (!open.length) return 'No open requirements were found on the report.'
  const lines = open.slice(0, 14).map((r) => `- ${r.name} (${r.group || r.section}): ${r.needed} ${r.kind === 'courses' ? 'course' : 'units'}${r.options.length ? ` · options: ${r.options.slice(0, 6).map((o) => o.code).join(', ')}` : ''}`)
  return [`Open requirements: ${open.length}.`, ...lines, open.length > 14 ? `…and ${open.length - 14} more.` : '', 'Status is inferred from the pasted report; verify with an advisor.'].filter(Boolean).join('\n')
}

export function answerLocally(question: string, env: ToolEnv): string | null {
  const q = question.trim()
  if (CHANGE.test(q)) return null
  const codes = codesIn(q, env)
  if (codes.length && ELIG.test(q)) return eligibilityAnswer(codes, env)
  if (!codes.length && LIST.test(q)) return listAnswer(q, env)
  if (!codes.length && NEED.test(q)) return needAnswer(env)
  return null
}
