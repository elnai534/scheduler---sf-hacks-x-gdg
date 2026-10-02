import { describe, expect, it } from 'vitest'
import raw from '../data/courses.json'
import { buildGraph, findCycle, topoSort } from './graph.ts'
import type { CourseNode } from './types.ts'

const courses = raw as CourseNode[]

describe('scraped catalog (DES, CSC, BIOL, AIS, MATH)', () => {
  it('has unique course codes and valid shape', () => {
    expect(new Set(courses.map((x) => x.code)).size).toBe(courses.length)
    for (const x of courses) {
      expect(x.code).toMatch(/^[A-Z]{2,5} \d{2,3}[A-Z]{0,3}$/)
      expect(x.title.length).toBeGreaterThan(0)
      expect(x.description).not.toMatch(/[<>]/)
    }
  })
  it('every course with prerequisite text produced groups, notes, or co-requisites (nothing silently lost)', () => {
    const lost = courses.filter((x) => x.prereqText && !x.prereqGroups.length && !x.notes.length && !x.coreqs.length && !x.concurrentOk.length)
    expect(lost.map((x) => `${x.code}: ${x.prereqText}`)).toEqual([])
  })
  it('is a DAG and topo-sorts', () => {
    const g = buildGraph(courses)
    expect(findCycle(g)).toBeNull()
    const order = topoSort(g)
    for (const e of g.edges) expect(order.indexOf(e.from)).toBeLessThan(order.indexOf(e.to))
  })
})

describe('section overlay', () => {
  it('every sample section refers to a real scraped course', async () => {
    const { SECTIONS } = await import('../data/sections')
    const codes = new Set(courses.map((c) => c.code))
    expect(Object.keys(SECTIONS).filter((k) => !codes.has(k))).toEqual([])
  })
  it('the app catalog is built from the scraped courses (one entry per course or section)', async () => {
    const { CATALOG } = await import('../data')
    expect(new Set(CATALOG.map((c) => c.code))).toEqual(new Set(courses.map((c) => c.code)))
    expect(CATALOG.every((c) => c.title && c.units >= 0)).toBe(true)
  })
})
