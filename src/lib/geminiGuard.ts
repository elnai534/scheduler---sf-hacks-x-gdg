import type { Course } from '../data'
import { cid } from '../data'
import { eligibility } from '../dag/graph'

export const OFF_TOPIC_MESSAGE =
  'This assistant only handles SF State course planning: requirements, prerequisites, eligibility and your schedule. Example: "What can I take online?"'
export const INJECTION_MESSAGE = 'I can’t change my instructions or share them. Ask me about your courses, requirements or schedule instead.'
export const MAX_QUESTION = 500
const MAX_MESSAGE = 1200

/** Phrases that try to rewrite the assistant's instructions or extract them. */
const INJECTION_RE = new RegExp(
  [
    String.raw`(ignore|disregard|forget|override|bypass)\b.{0,50}\b(instruction|prompt|rule|guideline|system|previous|above|earlier)`,
    String.raw`(reveal|show|print|repeat|output|leak|tell me)\b.{0,40}\b(system|hidden|initial|your)\b.{0,20}\b(prompt|instruction|rule|message)`,
    String.raw`system prompt`,
    String.raw`you are now\b`,
    String.raw`\bact as\b`,
    String.raw`pretend (to be|you)`,
    String.raw`developer mode`,
    String.raw`jailbreak`,
    String.raw`\bDAN\b`,
    String.raw`new instructions?:`,
  ].join('|'),
  'i',
)

/** Questions that are plain arithmetic, not course planning. */
const MATH_ONLY_RE = new RegExp(
  [
    String.raw`^[\s\d+\-*/x×÷^().,=?%]*$`,
    String.raw`\b(what('| i)?s|calculate|compute|solve|how (much|many) is)\b[^a-z]{0,20}\d+\s*[-+*/x×÷^]\s*\d+`,
  ].join('|'),
  'i',
)

/**
 * A question must mention something about course planning (a planning word or a course code) to reach the model.
 * Greetings, thanks, jokes, trivia, small talk and "help" alone are declined locally with no model call.
 */
const DAY = String.raw`(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day)?s?`
const PLAN_CUES = new RegExp(
  String.raw`\b(?:courses?|class(?:es)?|schedul\w*|semesters?|terms?|units?|credits?|requirements?|prereq\w*|pre-req\w*|eligib\w*|enrol\w*|regist\w*|take|taking|taken|add|drop|remove|swap|replace|online|in[- ]person|hybrid|async\w*|sync\w*|seats?|waitlist\w*|sections?|${DAY}|mornings?|afternoons?|evenings?|graduat\w*|degree|majors?|minors?|ge|electives?|instructors?|professors?|conflicts?|overlap\w*|workload|report|dpr|gwar|plan|plans|planning|recommend\w*|suggest\w*|remaining|fulfil\w*|satisf\w*|learn\w*|skills?|fits?|campus|catalog|bulletin|prerequisites?|credit|catalogue|advisor|need\w*|left|missing|finish\w*|complete\w*|still)\b`,
  'i',
)
const CODE_CUE = new RegExp(String.raw`\b[A-Z]{2,5} ?\d{2,3}[A-Z]{0,3}\b|\b(?:des|csc|math|biol|ais|adm|esm|engr|phys|chem|comm|econ|id) ?\d{3}[a-z]{0,3}\b`, 'i')
const hasPlanningCue = (q: string) => PLAN_CUES.test(q) || CODE_CUE.test(q)

const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060\\ufeff]', 'g')

/** Trim, drop control/invisible/bidi characters and angle brackets, cap length. */
export function cleanQuestion(q: string): string {
  return q.replace(CONTROL, ' ').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION)
}

export type Precheck = { ok: true; question: string } | { ok: false; reply: string }

/** Cheap local checks run before spending a model call. */
export function precheckQuestion(raw: string): Precheck {
  const q = cleanQuestion(raw)
  if (!q) return { ok: false, reply: 'Type a question about your courses or schedule.' }
  if (INJECTION_RE.test(q)) return { ok: false, reply: INJECTION_MESSAGE }
  if (MATH_ONLY_RE.test(q)) return { ok: false, reply: OFF_TOPIC_MESSAGE }
  if (!hasPlanningCue(q)) return { ok: false, reply: OFF_TOPIC_MESSAGE }
  return { ok: true, question: q }
}

/** For text that comes from a pasted report, the catalog or the user: keep it inert. Whitelist characters, cap length, drop injection phrases. */
export function sanitizeField(s: string, max = 90): string {
  const t = s.replace(CONTROL, ' ').replace(/[^A-Za-z0-9 .,:;&()'\/+=\-]/g, '').replace(/\s+/g, ' ').trim()
  if (INJECTION_RE.test(t)) return '[removed]'
  return t.slice(0, max)
}

export const COURSE_CODE = /^[A-Z]{2,5}(?: [A-Z])? \d{2,3}[A-Z]{0,3}$/

/** Remove links so the assistant can't be used to point students at other sites. */
export const stripUrls = (s: string) => s.replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]').replace(/\b[a-z0-9-]+\.(?:com|net|org|io|ru|xyz|ly|co)\b\S*/gi, '[link removed]')

export interface ReplyContext {
  catalog: Course[]
  accepted: Course[]
  /** Courses taken or in progress (assumed to finish). */
  assumed: Set<string>
  doing: Set<string>
}
export interface SafeReply { onTopic: boolean; message: string; add: Course[]; remove: string[]; dropped: string[] }

const isStr = (x: unknown): x is string => typeof x === 'string'

/** Sentences that express empathy, apology, reassurance, praise or feelings. The assistant is meant to be neutral and factual. */
const EMPATHY_RE = new RegExp(
  String.raw`\b(sorry|apolog\w*|i understand|i hear you|i know how|don'?t worry|no worries|that sounds (hard|tough|stressful|frustrating|overwhelming|difficult)|i feel|happy to help|glad to help|great question|good question|hope (this|that) helps|rest assured|i appreciate|thank(s| you) for|i('| a)?m here for you)\b`,
  'i',
)
export const stripEmpathy = (text: string) =>
  text.split(/(?<=[.!?])\s+/).filter((sentence) => !EMPATHY_RE.test(sentence)).join(' ').trim()

/**
 * Whatever the model returns, only this shape reaches the UI. Adds must exist, be new and be eligible.
 * A successful prompt injection therefore cannot add an ineligible course, remove something not on the schedule, or inject markup.
 */
export function sanitizeReply(raw: unknown, ctx: ReplyContext): SafeReply {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
  if (!o) throw new Error('Gemini returned an unexpected answer. Please try again.')
  if (o.onTopic === false) return { onTopic: false, message: OFF_TOPIC_MESSAGE, add: [], remove: [], dropped: [] }

  const dropped: string[] = []
  const acceptedIds = new Set(ctx.accepted.map(cid))
  const byId = new Map(ctx.catalog.map((c) => [cid(c), c]))
  const add: Course[] = []
  for (const id of (Array.isArray(o.add) ? o.add : []).filter(isStr).slice(0, 6)) {
    const c = byId.get(id)
    if (!c) dropped.push(`${sanitizeField(id, 30)} (not a class I know)`)
    else if (acceptedIds.has(id) || add.includes(c)) continue
    else if (ctx.assumed.has(c.code)) dropped.push(`${id} (already on your report)`)
    else {
      const el = eligibility(c.node, ctx.assumed, ctx.doing)
      if (el.ok) add.push(c)
      else dropped.push(`${id} (needs ${el.unmet.map((g) => g.join(' or ')).join(' and ')})`)
    }
  }
  const remove = [...new Set((Array.isArray(o.remove) ? o.remove : []).filter(isStr).slice(0, 10))].filter((id) => acceptedIds.has(id))

  let message = isStr(o.message) ? stripEmpathy(stripUrls(o.message.replace(CONTROL, ' ').replace(/[<>]/g, '')).replace(/[ \t]+/g, ' ').trim()).slice(0, MAX_MESSAGE) : ''
  // The model may claim it added something the checks refused; when nothing was added, its claim is discarded.
  if (dropped.length && !add.length) message = ''
  if (dropped.length) message += `${message ? '\n\n' : ''}Not added: ${dropped.join('; ')}.`
  if (!message && !add.length && !remove.length) message = OFF_TOPIC_MESSAGE
  return { onTopic: true, message, add, remove, dropped }
}
