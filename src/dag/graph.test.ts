import { describe, expect, it } from 'vitest'
import { allPrereqs, availableCourses, buildGraph, eligibility, findCycle, topoSort } from './graph.ts'
import type { CourseNode } from './types.ts'

const c = (code: string, groups: string[][] = [], extra: Partial<CourseNode> = {}): CourseNode => ({
  code, title: code, units: 3, prereqGroups: groups.map((anyOf) => ({ anyOf, alt: [] })), coreqs: [], concurrentOk: [], notes: [], permissionWaiver: false, prereqText: '', description: '', ...extra,
})

const A = c('A 100'), B = c('B 100', [['A 100']]), C = c('C 100', [['A 100'], ['B 100']]), D = c('D 100', [['B 100', 'X 100']])

describe('buildGraph', () => {
  it('creates edges prerequisite -> dependent without duplicates or self loops', () => {
    const g = buildGraph([A, B, C, c('E 1', [['E 1', 'A 100'], ['A 100']])])
    expect(g.edges.filter((e) => e.to === 'C 100').map((e) => e.from).sort()).toEqual(['A 100', 'B 100'])
    expect(g.edges.filter((e) => e.from === 'E 1')).toEqual([])
    expect(g.edges.filter((e) => e.from === 'A 100' && e.to === 'E 1')).toHaveLength(1)
  })
  it('adds unscraped prerequisites as external nodes', () => {
    const g = buildGraph([D])
    expect(g.nodes.get('X 100')).toBeNull()
  })
  it('marks OR edges', () => {
    expect(buildGraph([B, D]).edges.find((e) => e.to === 'D 100' && e.from === 'B 100')!.kind).toBe('or')
  })
  it('never makes edges from concurrent-ok or co-requisite courses', () => {
    const x = c('X 1', [['A 100']], { concurrentOk: ['Q 1'], coreqs: ['Z 1'] })
    expect(buildGraph([A, x]).edges.map((e) => e.from)).toEqual(['A 100'])
  })
})

describe('cycles and ordering', () => {
  it('detects a cycle', () => {
    const cyc = findCycle(buildGraph([c('A 1', [['B 1']]), c('B 1', [['A 1']])]))
    expect(cyc![0]).toBe(cyc![cyc!.length - 1])
    expect(new Set(cyc)).toEqual(new Set(['A 1', 'B 1']))
  })
  it('topoSort puts prerequisites first', () => {
    const order = topoSort(buildGraph([C, B, A]))
    expect(order.indexOf('A 100')).toBeLessThan(order.indexOf('B 100'))
    expect(order.indexOf('B 100')).toBeLessThan(order.indexOf('C 100'))
  })
  it('topoSort throws on a cycle', () => {
    expect(() => topoSort(buildGraph([c('A 1', [['B 1']]), c('B 1', [['A 1']])]))).toThrow(/Cycle/)
  })
})

describe('queries', () => {
  it('allPrereqs is transitive', () => {
    expect(allPrereqs(buildGraph([A, B, C]), 'C 100')).toEqual(['A 100', 'B 100'])
  })
  it('eligibility: AND groups all required, OR groups need one', () => {
    expect(eligibility(C, new Set(['A 100'])).unmet).toEqual([['B 100']])
    expect(eligibility(D, new Set(['X 100'])).ok).toBe(true)
    expect(eligibility(C, new Set(['A 100', 'B 100'])).ok).toBe(true)
  })
  it('concurrent-ok courses must be done or in progress', () => {
    const x = c('X 1', [], { concurrentOk: ['M 1'] })
    expect(eligibility(x, new Set()).ok).toBe(false)
    expect(eligibility(x, new Set(), new Set(['M 1'])).ok).toBe(true)
  })
  it('flags courses with non-course conditions for a human check', () => {
    expect(eligibility(c('N 1', [], { notes: ['Restricted to majors'] }), new Set()).needsHumanCheck).toBe(true)
    expect(eligibility(A, new Set()).needsHumanCheck).toBe(false)
  })
  it('availableCourses excludes completed and ineligible', () => {
    expect(availableCourses([A, B, C], new Set(['A 100'])).map((x) => x.code)).toEqual(['B 100'])
  })
})
