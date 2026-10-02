import type { Course, Day } from '../data'
import { cid, countConflicts, isOnline, range } from '../data'
import { allPrereqs, buildGraph, eligibility } from '../dag/graph'
import type { Graph } from '../dag/graph'
import { completedCodes, inProgressCodes, openRequirements } from '../dpr/parse'
import type { DprReport } from '../dpr/types'
import { recommend, skillTokens } from '../recommend/recommend'
import type { Prefs } from '../recommend/recommend'
import { COURSE_CODE, sanitizeField } from './geminiGuard'

/** Read-only tools the chatbot can call. They run the real prerequisite-graph code in the browser; nothing here changes the schedule. */
export const TOOL_DECLARATIONS = [
  { name: 'get_course', description: 'Details for one course: title, units, prerequisites, whether the student has it or is eligible, and its sections.', parameters: { type: 'OBJECT', properties: { code: { type: 'STRING', description: 'Course code, e.g. DES 505' } }, required: ['code'] } },
  { name: 'prerequisites_of', description: 'Every course that must come before a course (direct prerequisite groups plus the full chain), split into taken and still missing.', parameters: { type: 'OBJECT', properties: { code: { type: 'STRING' } }, required: ['code'] } },
  { name: 'unlocks', description: 'Which courses a course is a prerequisite for, directly and further down the chain, and which of them the student still needs.', parameters: { type: 'OBJECT', properties: { code: { type: 'STRING' } }, required: ['code'] } },
  { name: 'path_to', description: 'The ordered list of courses the student must take before a target course, with the minimum number of terms that implies.', parameters: { type: 'OBJECT', properties: { code: { type: 'STRING' } }, required: ['code'] } },
  {
    name: 'search_courses',
    description: 'Search class sections by topic words and filters. Returns up to 8 sections with status for this student.',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'Topic words such as "web design"' }, online_only: { type: 'BOOLEAN' }, days: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Only these days: Mon, Tue, Wed, Thu, Fri' }, eligible_only: { type: 'BOOLEAN' } } },
  },
  { name: 'open_requirements', description: 'The degree requirements still open on the student\'s report, with how much is needed and candidate courses.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'check_schedule', description: 'Units and time conflicts of the current schedule.', parameters: { type: 'OBJECT', properties: {} } },
  {
    name: 'recommend',
    description: 'Run the schedule recommender with optional preference overrides. Returns suggested sections with reasons.',
    parameters: { type: 'OBJECT', properties: { online_only: { type: 'BOOLEAN' }, days: { type: 'ARRAY', items: { type: 'STRING' } }, fast: { type: 'BOOLEAN' }, skills: { type: 'STRING' }, target_units: { type: 'NUMBER' } } },
  },
] as const

export interface ToolEnv {
  report: DprReport | null
  accepted: Course[]
  /** Sections that can be scheduled. */
  schedulable: Course[]
  /** Every catalog course (any subject). */
  all: Course[]
  prefs: Prefs
}

const graphs = new WeakMap<Course[], Graph>()
const graphOf = (all: Course[]) => {
  let g = graphs.get(all)
  if (!g) {
    g = buildGraph(all.map((c) => c.node).filter((n, i, a) => a.findIndex((m) => m.code === n.code) === i))
    graphs.set(all, g)
  }
  return g
}

const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const dayList = (v: unknown): Day[] => (Array.isArray(v) ? v.filter((d): d is string => typeof d === 'string').map((d) => DAYS.find((x) => x.toLowerCase() === d.slice(0, 3).toLowerCase())).filter((d): d is Day => Boolean(d)) : [])
const asCode = (v: unknown): string | null => {
  const c = typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, ' ') : ''
  return COURSE_CODE.test(c) ? c : null
}
const t = (s: string, n = 90) => sanitizeField(s, n)

export function runTool(name: string, rawArgs: unknown, env: ToolEnv): unknown {
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>
  const done = env.report ? completedCodes(env.report) : new Set<string>()
  const doing = env.report ? inProgressCodes(env.report) : new Set<string>()
  const assumed = new Set([...done, ...doing]) // in-progress courses are assumed to finish
  const graph = graphOf(env.all)
  const node = (code: string) => graph.nodes.get(code) ?? null
  const status = (code: string) => {
    if (assumed.has(code)) return 'taken or in progress'
    const n = node(code)
    if (!n) return 'not in the catalog'
    const e = eligibility(n, assumed, doing)
    return e.ok ? 'eligible' : `needs ${e.unmet.map((g) => g.join(' or ')).join(' and ')}`
  }
  const groupsText = (code: string) => (node(code)?.prereqGroups ?? []).map((g) => g.anyOf.join(' or '))
  const needCode = (): string | { error: string } => asCode(args.code) ?? { error: 'Give a course code like "DES 505".' }

  switch (name) {
    case 'get_course': {
      const code = needCode()
      if (typeof code !== 'string') return code
      const n = node(code)
      if (!n) return { error: `${code} is not in the catalog.` }
      return {
        code, title: t(n.title), units: n.units, description: t(n.description, 220), prerequisites_all_required: groupsText(code), corequisites: n.coreqs, may_be_taken_concurrently: n.concurrentOk,
        other_conditions: n.notes.map((x) => t(x, 100)).slice(0, 3), permission_alternative: n.permissionWaiver, status: status(code),
        sections: env.schedulable.filter((c) => c.code === code).slice(0, 4).map((c) => ({ id: cid(c), mode: c.mode, days: [...new Set(c.meetings.map((m) => m.day))], seats: c.seats })),
      }
    }
    case 'prerequisites_of': {
      const code = needCode()
      if (typeof code !== 'string') return code
      if (!node(code)) return { error: `${code} is not in the catalog.` }
      const chain = allPrereqs(graph, code)
      return { code, direct_prerequisites_all_required: groupsText(code), full_chain_taken: chain.filter((c) => assumed.has(c)), full_chain_missing: chain.filter((c) => !assumed.has(c)), note: 'The chain lists every course in any alternative; "or" groups need only one.' }
    }
    case 'unlocks': {
      const code = needCode()
      if (typeof code !== 'string') return code
      if (!node(code)) return { error: `${code} is not in the catalog.` }
      const direct = graph.out.get(code) ?? []
      const seen = new Set<string>()
      const queue = [...direct]
      while (queue.length) { const c = queue.shift()!; if (seen.has(c)) continue; seen.add(c); queue.push(...(graph.out.get(c) ?? [])) }
      const needed = new Set(env.report ? openRequirements(env.report).flatMap((q) => q.options.map((o) => o.code)) : [])
      return { code, directly_unlocks: direct.slice(0, 15), total_unlocked_down_the_chain: seen.size, still_needed_by_student: [...seen].filter((c) => needed.has(c) && !assumed.has(c)).slice(0, 15) }
    }
    case 'path_to': {
      const code = needCode()
      if (typeof code !== 'string') return code
      if (!node(code)) return { error: `${code} is not in the catalog.` }
      const level = new Map<string, number>()
      const order: string[] = []
      const alternatives: Record<string, string[]> = {}
      const visit = (c: string, guard: Set<string>): number => {
        if (assumed.has(c)) return 0
        if (level.has(c)) return level.get(c)!
        if (guard.has(c)) return 1
        guard.add(c)
        let best = 0
        for (const g of node(c)?.prereqGroups ?? []) {
          if (g.anyOf.some((p) => assumed.has(p))) continue
          const options = g.anyOf.map((p) => ({ p, lv: visit(p, new Set(guard)) })).sort((a, b) => a.lv - b.lv || a.p.localeCompare(b.p))
          const pick = options[0]
          if (g.anyOf.length > 1) alternatives[pick.p] = g.anyOf.filter((x) => x !== pick.p)
          if (!order.includes(pick.p)) order.push(pick.p)
          best = Math.max(best, pick.lv)
        }
        const lv = best + 1
        level.set(c, lv)
        return lv
      }
      const levels = visit(code, new Set())
      const steps = order.filter((c) => !assumed.has(c)).sort((a, b) => (level.get(a) ?? 0) - (level.get(b) ?? 0) || a.localeCompare(b))
      return {
        target: code, status: status(code), take_first_in_this_order: steps.map((c) => ({ course: c, title: t(node(c)?.title ?? ''), needs: groupsText(c), alternative_if_any: alternatives[c] ?? [] })),
        minimum_terms_including_target: levels, note: 'Courses at the same level can be taken in the same term. "alternative_if_any" are other options for that slot.',
      }
    }
    case 'search_courses': {
      const tokens = skillTokens(typeof args.query === 'string' ? args.query : '')
      const days = dayList(args.days)
      const rows = env.schedulable
        .filter((c) => (args.online_only === true ? isOnline(c.mode) : true) && (days.length ? c.meetings.every((m) => days.includes(m.day)) : true))
        .map((c) => ({ c, hits: tokens.filter((x) => `${c.title} ${c.description}`.toLowerCase().includes(x)).length, st: status(c.code) }))
        .filter((r) => (tokens.length ? r.hits > 0 : true) && (args.eligible_only === true ? r.st === 'eligible' : true))
        .sort((a, b) => b.hits - a.hits || cid(a.c).localeCompare(cid(b.c)))
        .slice(0, 8)
      return { results: rows.map(({ c, st }) => ({ id: cid(c), title: t(c.title), units: c.units, mode: c.mode, days: [...new Set(c.meetings.map((m) => m.day))], seats: c.seats, status: st })), note: 'Days, modes and seats are sample data.' }
    }
    case 'open_requirements': {
      if (!env.report) return { error: 'No degree report is loaded.' }
      return { open: openRequirements(env.report).slice(0, 30).map((q) => ({ name: t(q.name), group: t(q.group || q.section), needed: `${q.needed} ${q.kind === 'courses' ? 'course' : 'units'}`, candidates: q.options.map((o) => o.code).filter((c) => COURSE_CODE.test(c)).slice(0, 12) })) }
    }
    case 'check_schedule':
      return { units: env.accepted.reduce((n, c) => n + c.units, 0), time_conflicts: countConflicts(env.accepted), classes: env.accepted.map((c) => ({ id: cid(c), mode: c.mode, meetings: c.meetings.map((m) => `${m.day} ${range(m.start, m.end)}`) })) }
    case 'recommend': {
      if (!env.report) return { error: 'No degree report is loaded.' }
      const p: Prefs = {
        ...env.prefs,
        ...(typeof args.online_only === 'boolean' ? { onlineOnly: args.online_only } : {}),
        ...(Array.isArray(args.days) ? { days: dayList(args.days) } : {}),
        ...(typeof args.fast === 'boolean' ? { fast: args.fast } : {}),
        ...(typeof args.skills === 'string' ? { skills: t(args.skills, 80) } : {}),
        ...(typeof args.target_units === 'number' && args.target_units > 0 && args.target_units <= 21 ? { targetUnits: Math.round(args.target_units) } : {}),
      }
      const r = recommend(env.report, env.all.filter((c) => c.mode !== 'Catalog only'), p)
      return { picks: r.picks.map((x) => ({ id: cid(x.section), for: t(x.requirement), reasons: x.reasons.slice(0, 4).map((y) => t(y, 80)) })), total_units: r.totalUnits, not_covered: r.uncovered.slice(0, 6).map((u) => ({ requirement: t(u.requirement), why: t(u.why, 120) })), note: 'Suggestion only; the student decides what to add.' }
    }
    default:
      return { error: `Unknown tool "${t(name, 30)}".` }
  }
}

/**
 * Only questions about the prerequisite graph or a search get the tools; everything else is answered from the prompt in ONE request.
 * Each tool round is another request against a small shared quota (15/minute), and lighter models over-use tools when offered.
 */
const GRAPH_CUES = /\b(prereq\w*|pre-req\w*|before|unlock\w*|path|chain|sequence|order|fewest|fastest|earliest|soonest|how (many|long) (terms?|semesters?|quarters?)|depends?|leads? to|opens? up|requires?|required for|find|search|look ?up|anything (about|on)|classes? (about|on)|courses? (about|on))\b/i
export const needsGraphTools = (question: string) => GRAPH_CUES.test(question)
