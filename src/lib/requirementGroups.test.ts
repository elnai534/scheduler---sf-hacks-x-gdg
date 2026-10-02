import { describe, expect, it } from 'vitest'
import type { DprReport, DprRequirement } from '../dpr/types'
import { requirementSections, unitsTowardDegree } from './requirementGroups'

const q = (name: string, section: string, group: string, status: DprRequirement['status'] = 'open'): DprRequirement =>
  ({ id: name, name, group, section, kind: 'courses', required: 1, taken: 0, needed: 1, status, satisfiedBy: [], options: [], optionsTotal: null, notes: [] })
const report = (requirements: DprRequirement[], units: number[] = []): DprReport => ({
  career: '', program: '', plans: [], lastTerm: '', warnings: [], requirements,
  courses: units.map((u, i) => ({ code: `X ${i}`, title: '', units: u, when: '', grade: '', status: 'completed' as const })),
})

describe('requirementSections', () => {
  const r = report([
    q('120 Minimum Units Required for Degree', 'University Requirements', '120 Minimum Units Required for Degree'),
    q('Courses Completed / In-Progress', 'Courses Completed / In-Progress', 'Courses Completed / In-Progress', 'filled'),
    q('Residence Units = 30 Units', 'University Requirements', 'Residence Units'),
    q('Graduation Writing Assessment Requirement (GWAR)', 'University Requirements', 'GWAR'),
    q('California State and Local Government', 'University Requirements', 'U.S. History, U.S. Government', 'open'),
    q('Area 1A: English Composition', 'General Education Requirements', 'Area 1: English Communication'),
    q('Area 3UD: Arts or Humanities', 'General Education Requirements', 'Upper Division General Education', 'filled'),
  ])
  const sections = requirementSections(r)
  it('drops the 120-unit, Courses Completed and residence rows', () => {
    expect(sections.flatMap((s) => s.items.map((i) => i.label)).join('|')).not.toMatch(/120 Minimum|Courses Completed|Residence/)
  })
  it('moves CA government into its own section after University, one item each', () => {
    const names = sections.map((s) => s.name)
    expect(names[names.indexOf('University Requirements') + 1]).toBe('CA State and Local Government Requirements')
    expect(sections.find((s) => s.name.startsWith('CA'))!.items.map((i) => i.label)).toEqual(['U.S. History', 'U.S. Government', 'California State and Local Government'])
  })
  it('splits General Education into Lower and Upper Division', () => {
    const ge = sections.find((s) => s.name.startsWith('General'))!
    expect(ge.items.map((i) => i.sub)).toEqual(['Lower Division', 'Upper Division'])
  })
})

describe('unitsTowardDegree', () => {
  it('adds report units and selected units', () => expect(unitsTowardDegree(report([], [3, 3, 1]), 6)).toBe(13))
})
