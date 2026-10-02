import { describe, expect, it } from 'vitest'
import { SCHEDULABLE, conflictsWith } from '../data'
import { addIssues } from './addIssues'

describe('addIssues', () => {
  it('flags a permission-number class', () => {
    const c = SCHEDULABLE.find((x) => x.permission)
    if (!c) return
    expect(addIssues(c, [], null).some((i) => i.includes('permission number'))).toBe(true)
  })
  it('flags a time conflict with a different course', () => {
    const timed = SCHEDULABLE.filter((c) => c.meetings.length && !c.permission)
    const a = timed[0]
    const b = timed.find((x) => x.code !== a.code && conflictsWith(x, [a]))
    expect(b).toBeDefined()
    expect(addIssues(b!, [a], null).some((i) => i.startsWith('Time conflict'))).toBe(true)
  })
  it('is quiet for a clean add', () => {
    const c = SCHEDULABLE.find((x) => !x.permission && x.meetings.length)!
    expect(addIssues(c, [], null)).toEqual([])
  })
})
