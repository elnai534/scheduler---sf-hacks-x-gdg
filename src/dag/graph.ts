import type { CourseNode } from './types.ts'

export interface Edge { from: string; to: string; kind: 'and' | 'or' }
export interface Graph {
  nodes: Map<string, CourseNode | null> // null = referenced but not scraped
  edges: Edge[]
  out: Map<string, string[]>
  into: Map<string, string[]>
}

export function buildGraph(courses: CourseNode[]): Graph {
  const nodes = new Map<string, CourseNode | null>()
  for (const c of courses) nodes.set(c.code, c)
  const edges: Edge[] = []
  const seen = new Set<string>()
  for (const c of courses) {
    for (const g of c.prereqGroups) {
      for (const from of g.anyOf) {
        if (from === c.code) continue
        const key = `${from}>${c.code}`
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ from, to: c.code, kind: g.anyOf.length > 1 ? 'or' : 'and' })
        if (!nodes.has(from)) nodes.set(from, null)
      }
    }
  }
  const out = new Map<string, string[]>()
  const into = new Map<string, string[]>()
  for (const k of nodes.keys()) { out.set(k, []); into.set(k, []) }
  for (const e of edges) { out.get(e.from)!.push(e.to); into.get(e.to)!.push(e.from) }
  return { nodes, edges, out, into }
}

/** Returns one cycle as [a, b, ..., a], or null if the graph is a DAG. */
export function findCycle(g: Graph): string[] | null {
  const state = new Map<string, 0 | 1 | 2>()
  const stack: string[] = []
  const visit = (n: string): string[] | null => {
    state.set(n, 1)
    stack.push(n)
    for (const m of g.out.get(n) ?? []) {
      if (state.get(m) === 1) return [...stack.slice(stack.indexOf(m)), m]
      if (!state.get(m)) { const c = visit(m); if (c) return c }
    }
    stack.pop()
    state.set(n, 2)
    return null
  }
  for (const n of g.nodes.keys()) if (!state.get(n)) { const c = visit(n); if (c) return c }
  return null
}

/** Prerequisites before dependents. Throws if there is a cycle. */
export function topoSort(g: Graph): string[] {
  const cycle = findCycle(g)
  if (cycle) throw new Error(`Cycle: ${cycle.join(' -> ')}`)
  const indeg = new Map<string, number>()
  for (const n of g.nodes.keys()) indeg.set(n, g.into.get(n)!.length)
  const queue = [...g.nodes.keys()].filter((n) => indeg.get(n) === 0).sort()
  const order: string[] = []
  while (queue.length) {
    const n = queue.shift()!
    order.push(n)
    for (const m of g.out.get(n)!) {
      indeg.set(m, indeg.get(m)! - 1)
      if (indeg.get(m) === 0) { queue.push(m); queue.sort() }
    }
  }
  return order
}

/** Every course that appears (directly or transitively) in any prerequisite option for `code`. */
export function allPrereqs(g: Graph, code: string): string[] {
  const seen = new Set<string>()
  const walk = (n: string) => { for (const p of g.into.get(n) ?? []) if (!seen.has(p)) { seen.add(p); walk(p) } }
  walk(code)
  return [...seen].sort()
}

export interface Eligibility { ok: boolean; unmet: string[][]; needsHumanCheck: boolean }

/** Which prerequisite groups still lack a completed course. `needsHumanCheck` = non-course conditions exist. */
export function eligibility(course: CourseNode, completed: Set<string>, inProgress: Set<string> = new Set()): Eligibility {
  const unmet: string[][] = []
  for (const g of course.prereqGroups) if (!g.anyOf.some((c) => completed.has(c))) unmet.push(g.anyOf)
  const concurrentUnmet = course.concurrentOk.filter((c) => !completed.has(c) && !inProgress.has(c))
  if (concurrentUnmet.length) unmet.push(concurrentUnmet)
  return { ok: unmet.length === 0, unmet, needsHumanCheck: course.notes.length > 0 || course.permissionWaiver }
}

export function availableCourses(courses: CourseNode[], completed: Set<string>, inProgress: Set<string> = new Set()): CourseNode[] {
  return courses.filter((c) => !completed.has(c.code) && eligibility(c, completed, inProgress).ok)
}
