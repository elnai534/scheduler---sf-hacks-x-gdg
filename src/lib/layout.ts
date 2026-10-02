import type { ReqItem, ReqSection } from './requirementGroups'

export interface CustomItem { key: string; label: string; section: string }
/** The student's rearrangement of the report-filled requirement list. Keys are ReqItem.key. */
export interface Layout {
  removed: string[]
  /** item key -> section it was moved to */
  moved: Record<string, string>
  /** section -> item keys in the order the student set (unlisted items follow) */
  order: Record<string, string[]>
  custom: CustomItem[]
}
export const EMPTY_LAYOUT: Layout = { removed: [], moved: {}, order: {}, custom: [] }

/** Applies removals, additions, moves and ordering on top of the sections built from the report. Pure. */
export function applyLayout(sections: ReqSection[], layout: Layout, overrides: Record<string, string> = {}): ReqSection[] {
  const byName = new Map<string, ReqSection>()
  const out: ReqSection[] = []
  const get = (name: string) => {
    let s = byName.get(name)
    if (!s) { s = { name, items: [], done: 0 }; byName.set(name, s); out.push(s) }
    return s
  }
  for (const s of sections) get(s.name)
  const hasSubs = (name: string) => sections.find((s) => s.name === name)?.items.some((i) => i.sub) ?? false
  const place = (item: ReqItem, to: string) => {
    const sub = hasSubs(to) ? item.sub ?? 'Lower Division' : undefined
    get(to).items.push({ ...item, sub })
  }
  for (const s of sections) {
    for (const i of s.items) {
      if (layout.removed.includes(i.key)) continue
      const to = layout.moved[i.key]
      if (to && to !== s.name) place({ ...i, manual: true }, to)
      else get(s.name).items.push(i)
    }
  }
  for (const c of layout.custom) {
    if (layout.removed.includes(c.key)) continue
    const item: ReqItem = { key: c.key, reqId: c.key, label: c.label, status: overrides[c.key] === 'filled' ? 'filled' : 'open', manual: true, custom: true }
    place(item, layout.moved[c.key] ?? c.section)
  }
  for (const s of out) {
    const order = layout.order[s.name]
    if (order) s.items.sort((a, b) => (order.indexOf(a.key) + 1 || 1e9) - (order.indexOf(b.key) + 1 || 1e9))
    s.done = s.items.filter((i) => i.status === 'filled').length
  }
  return out
}
