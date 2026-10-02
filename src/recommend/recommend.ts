import type { Course, Day } from '../data'
import { cid, conflictsWith, isOnline } from '../data'
import { buildGraph, eligibility } from '../dag/graph'
import { completedCodes, inProgressCodes, openRequirements } from '../dpr/parse'
import type { DprReport } from '../dpr/types'

export interface Prefs {
  onlineOnly: boolean
  /** Only these days may have meetings. Empty = any day. */
  days: Day[]
  /** Prefer courses that unlock the most remaining requirements. */
  fast: boolean
  /** Free text, e.g. "web design, python". Matched against course titles and descriptions. */
  skills: string
  /** Exclude sections with no open seats. */
  seatsOnly: boolean
  targetUnits: number
  /** false = ignore the ranked priority list (default on). */
  usePriorities?: boolean
}

export const DEFAULT_PREFS: Prefs = { onlineOnly: false, days: [], fast: false, skills: '', seatsOnly: false, targetUnits: 12 }

export interface Pick { section: Course; requirement: string; reasons: string[]; score: number }
export interface Recommendation {
  picks: Pick[]
  totalUnits: number
  /** Requirements that could not be filled, with the reason. */
  uncovered: { requirement: string; why: string }[]
  /** How many candidate sections each hard rule removed (for transparency). */
  filteredOut: { online: number; days: number; seats: number; prerequisites: number; conflicts: number }
  notes: string[]
  /** Skill matches the student cannot take yet, with what they need first. */
  blockedInterests: { code: string; title: string; needs: string }[]
}

const STOP = new Set(['the', 'and', 'for', 'with', 'want', 'learn', 'about', 'skills', 'skill', 'how', 'into', 'some', 'who', 'that', 'this', 'from', 'use', 'using'])
export const skillTokens = (s: string) => [...new Set(s.toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t.length > 2 && !STOP.has(t)))]

function skillHits(c: Course, tokens: string[]) {
  const title = c.title.toLowerCase()
  const desc = c.description.toLowerCase()
  const inTitle = tokens.filter((t) => title.includes(t))
  const inDesc = tokens.filter((t) => !inTitle.includes(t) && desc.includes(t))
  return { inTitle, inDesc, score: inTitle.length * 6 + inDesc.length * 2 }
}

export function recommend(report: DprReport, catalog: Course[], prefs: Prefs): Recommendation {
  const filteredOut = { online: 0, days: 0, seats: 0, prerequisites: 0, conflicts: 0 }
  const notes: string[] = []
  const have = new Set(report.courses.map((c) => c.code))
  const done = new Set([...completedCodes(report), ...inProgressCodes(report)]) // in-progress assumed to finish
  const doing = inProgressCodes(report)
  const tokens = skillTokens(prefs.skills)
  const sectionsOf = (code: string) => catalog.filter((c) => c.code === code && c.mode !== 'Catalog only')

  const open = openRequirements(report).filter((q) => q.options.length > 0)
  const requiredCodes = new Set(open.flatMap((q) => q.options.map((o) => o.code)).filter((c) => !have.has(c)))

  // "graduate fast": how long is the chain of still-needed courses that this course gates?
  const nodes = new Map(catalog.map((c) => [c.code, c.node]))
  const graph = buildGraph([...nodes.values()])
  const depthMemo = new Map<string, number>()
  const depth = (code: string, seen = new Set<string>()): number => {
    if (depthMemo.has(code)) return depthMemo.get(code)!
    if (seen.has(code)) return 1
    seen.add(code)
    let best = 1
    for (const child of graph.out.get(code) ?? []) if (requiredCodes.has(child)) best = Math.max(best, 1 + depth(child, seen))
    depthMemo.set(code, best)
    return best
  }
  const unlocks = (code: string) => (graph.out.get(code) ?? []).filter((c) => requiredCodes.has(c))

  const passes = (c: Course): boolean => {
    if (prefs.onlineOnly && !isOnline(c.mode)) { filteredOut.online++; return false }
    if (prefs.days.length && c.meetings.some((m) => !prefs.days.includes(m.day))) { filteredOut.days++; return false }
    if (prefs.seatsOnly && c.seats <= 0) { filteredOut.seats++; return false }
    return true
  }

  interface Cand { section: Course; reqId: string; reqName: string; needed: number; score: number; reasons: string[] }
  const candidates: Cand[] = []
  const uncovered: Recommendation['uncovered'] = []

  for (const q of open) {
    const codes = [...new Set(q.options.map((o) => o.code))].filter((c) => !have.has(c))
    const why = new Set<string>()
    let found = 0
    for (const code of codes) {
      const secs = sectionsOf(code)
      if (!secs.length) { why.add(`${code} has no section data`); continue }
      const node = secs[0].node
      const el = eligibility(node, done, doing)
      if (!el.ok) { filteredOut.prerequisites += secs.length; why.add(`${code} needs ${el.unmet.map((g) => g.join(' or ')).join(' and ')}`); continue }
      for (const s of secs) {
        if (!passes(s)) { why.add(`${code} ${s.section} excluded by your preferences`); continue }
        const reasons = [`Fills ${q.name}${q.group && q.group !== q.name ? ` (${q.group})` : ''}`, `${s.mode}${s.meetings.length ? ` · ${[...new Set(s.meetings.map((m) => m.day))].join('/')}` : ''}`]
        let score = 20 + Math.min(q.needed, 6)
        if (codes.length <= 2) { score += 8; reasons.push('Required course') } // named courses outrank elective pools
        if (prefs.fast) {
          const d = depth(code)
          const u = unlocks(code)
          score += 4 * (d - 1) + 3 * u.length
          if (u.length) reasons.push(`Unlocks ${u.slice(0, 3).join(', ')}`)
          else if (d > 1) reasons.push('On a longer prerequisite chain')
        }
        const h = skillHits(s, tokens)
        if (h.score) { score += h.score; reasons.push(`Matches “${[...h.inTitle, ...h.inDesc].join(', ')}”`) }
        if (s.seats > 0) score += 2
        else { score -= 5; reasons.push(`Full (waitlist ${s.waitlist})`) }
        if (s.permission) { score -= 3; reasons.push('Permission number required') }
        if (el.needsHumanCheck) reasons.push('Check major/standing restrictions')
        candidates.push({ section: s, reqId: q.id, reqName: q.name, needed: q.needed, score, reasons })
        found++
      }
    }
    if (!found) uncovered.push({ requirement: q.name, why: [...why].slice(0, 3).join('; ') || 'no candidate courses' })
  }

  // greedy pick: best score first, no duplicate course, no time conflicts, stay within target units
  const picks: Pick[] = []
  const covered = new Map<string, number>()
  let total = 0
  const pickable = (c: Cand) =>
    !picks.some((p) => p.section.code === c.section.code) &&
    (covered.get(c.reqId) ?? 0) < c.needed &&
    total + c.section.units <= prefs.targetUnits
  for (;;) {
    let best: Cand | null = null
    for (const c of candidates.sort((a, b) => b.score - a.score || cid(a.section).localeCompare(cid(b.section)))) {
      if (!pickable(c)) continue
      if (conflictsWith(c.section, picks.map((p) => p.section))) { filteredOut.conflicts++; continue }
      best = c
      break
    }
    if (!best) break
    picks.push({ section: best.section, requirement: best.reqName, reasons: best.reasons, score: best.score })
    covered.set(best.reqId, (covered.get(best.reqId) ?? 0) + best.section.units)
    total += best.section.units
  }

  // interests: spend leftover units on the best skill matches outside the requirement lists
  if (tokens.length) {
    const extra = catalog
      .filter((c) => c.mode !== 'Catalog only' && !have.has(c.code) && !picks.some((p) => p.section.code === c.code) && skillHits(c, tokens).score > 0)
      .filter((c) => eligibility(c.node, done, doing).ok && passes(c))
      .sort((a, b) => skillHits(b, tokens).score - skillHits(a, tokens).score || cid(a).localeCompare(cid(b)))
    for (const c of extra) {
      if (total + c.units > prefs.targetUnits) continue
      if (conflictsWith(c, picks.map((p) => p.section))) continue
      const h = skillHits(c, tokens)
      picks.push({ section: c, requirement: 'Elective (matches your interests)', reasons: [`Matches “${[...h.inTitle, ...h.inDesc].join(', ')}”`, c.mode], score: h.score })
      total += c.units
    }
  }

  const blockedInterests: Recommendation['blockedInterests'] = []
  if (tokens.length) {
    const seenCodes = new Set<string>()
    const blocked = catalog
      .filter((c) => c.mode !== 'Catalog only' && !have.has(c.code) && skillHits(c, tokens).score > 0)
      .sort((a, b) => skillHits(b, tokens).score - skillHits(a, tokens).score || a.code.localeCompare(b.code))
    for (const c of blocked) {
      if (seenCodes.has(c.code) || blockedInterests.length >= 3) continue
      const el = eligibility(c.node, done, doing)
      if (el.ok) continue
      seenCodes.add(c.code)
      blockedInterests.push({ code: c.code, title: c.title, needs: el.unmet.map((g) => g.join(' or ')).join(' and ') })
    }
    if (!picks.some((p) => p.requirement.startsWith('Elective')) && blockedInterests.length) notes.push(`Courses matching “${prefs.skills}” need prerequisites first (see below).`)
  }
  if (total < prefs.targetUnits) notes.push(`Only ${total} of ${prefs.targetUnits} target units could be filled with your preferences.`)
  if (!open.length) notes.push('No open requirements with course options were found in the report.')
  return { picks, totalUnits: total, uncovered, filteredOut, notes, blockedInterests }
}
