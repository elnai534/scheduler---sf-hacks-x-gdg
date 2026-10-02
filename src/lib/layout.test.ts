import { describe, expect, it } from 'vitest'
import { EMPTY_LAYOUT, applyLayout } from './layout'
import type { ReqSection } from './requirementGroups'

const item = (key: string, status: 'open' | 'filled' = 'open', sub?: 'Lower Division' | 'Upper Division') => ({ key, reqId: key, label: key, status, sub })
const sections = (): ReqSection[] => [
  { name: 'A', items: [item('a1'), item('a2', 'filled'), item('a3')], done: 1 },
  { name: 'GE', items: [item('g1', 'open', 'Lower Division')], done: 0 },
]
const keys = (s: ReqSection[], name: string) => s.find((x) => x.name === name)!.items.map((i) => i.key)

describe('applyLayout', () => {
  it('is a no-op for an empty layout', () => expect(applyLayout(sections(), EMPTY_LAYOUT).map((s) => keys([s], s.name))).toEqual([['a1', 'a2', 'a3'], ['g1']]))
  it('removes items and recounts done', () => {
    const out = applyLayout(sections(), { ...EMPTY_LAYOUT, removed: ['a2'] })
    expect(keys(out, 'A')).toEqual(['a1', 'a3'])
    expect(out[0].done).toBe(0)
  })
  it('reorders, with unlisted items after', () => expect(keys(applyLayout(sections(), { ...EMPTY_LAYOUT, order: { A: ['a3', 'a1'] } }), 'A')).toEqual(['a3', 'a1', 'a2']))
  it('moves an item to another section; into a section with subsections it lands in Lower Division', () => {
    const out = applyLayout(sections(), { ...EMPTY_LAYOUT, moved: { a1: 'GE' } })
    expect(keys(out, 'A')).toEqual(['a2', 'a3'])
    expect(out[1].items.find((i) => i.key === 'a1')).toMatchObject({ sub: 'Lower Division', manual: true })
  })
  it('adds custom items, done only when overridden', () => {
    const lay = { ...EMPTY_LAYOUT, custom: [{ key: 'c1', label: 'Mine', section: 'A' }] }
    expect(applyLayout(sections(), lay)[0].items.at(-1)).toMatchObject({ label: 'Mine', status: 'open', custom: true })
    expect(applyLayout(sections(), lay, { c1: 'filled' })[0].done).toBe(2)
  })
  it('creates a section for a custom item in an unknown section', () => {
    const out = applyLayout(sections(), { ...EMPTY_LAYOUT, custom: [{ key: 'c1', label: 'Mine', section: 'New' }] })
    expect(keys(out, 'New')).toEqual(['c1'])
  })
})
