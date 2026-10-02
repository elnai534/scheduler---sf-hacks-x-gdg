import { describe, expect, it } from 'vitest'
import type { DprReport } from '../dpr/types'
import { editReport, reportRows } from './reportEdit'

const base: DprReport = { career: 'Undergraduate', program: 'BS Design', plans: ['VCD-BS', 'CSC-MN'], lastTerm: 'Fall 2026', requirements: [], courses: [], warnings: [] }

describe('reportEdit', () => {
  it('lists rows with plans joined', () => {
    expect(reportRows(base).map((r) => r.value)).toEqual(['Undergraduate', 'BS Design', 'VCD-BS + CSC-MN', 'Fall 2026'])
  })
  it('edits a scalar field without mutating the original', () => {
    const next = editReport(base, 'lastTerm', '  Spring 2027 ')
    expect(next.lastTerm).toBe('Spring 2027')
    expect(base.lastTerm).toBe('Fall 2026')
  })
  it('splits plans on +', () => {
    expect(editReport(base, 'plans', 'A-BS + B-MN').plans).toEqual(['A-BS', 'B-MN'])
    expect(editReport(base, 'plans', '').plans).toEqual([])
  })
})
