import type { Day, Meeting } from '../data'
import type { SectionInfo } from './sections'

/**
 * Deterministic SAMPLE sections (days, modes, seats) for courses the bulletin has no schedule for.
 * Derived from a hash of the course code so every run and every test sees the same data.
 * Not real SF State availability. Replace with class-search data when it becomes reachable.
 */
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h }

const PATTERNS: Day[][] = [['Mon', 'Wed'], ['Tue', 'Thu'], ['Mon', 'Wed', 'Fri'], ['Fri'], ['Tue'], ['Wed'], ['Thu']]
const MODES = ['In person', 'In person', 'In person', 'In person', 'Hybrid', 'Hybrid', 'Online asynchronous', 'Online asynchronous', 'Online asynchronous', 'Online synchronous'] as const

const SAMPLE_SUBJECTS = new Set(['DES', 'CSC'])

export const hasSampleSections = (code: string) => {
  const [subject, num] = code.split(' ')
  return SAMPLE_SUBJECTS.has(subject) && parseInt(num, 10) < 700
}

export function sampleSections(code: string, units: number): SectionInfo[] {
  const h = hash(code)
  const count = h % 3 === 0 ? 2 : 1
  const out: SectionInfo[] = []
  for (let i = 0; i < count; i++) {
    const s = hash(`${code}#${i}`)
    const mode = MODES[s % MODES.length]
    const days = PATTERNS[(s >>> 3) % PATTERNS.length]
    const long = days.length === 1
    const start = (8 + ((s >>> 6) % 8)) * 60 + (((s >>> 9) % 2) * 30)
    const dur = long ? 170 : days.length === 3 ? 50 : 75
    const room = `${['Burk Hall', 'Hensill Hall', 'Science', 'Creative Arts'][(s >>> 11) % 4]} ${100 + ((s >>> 13) % 300)}`
    let meetings: Meeting[] = []
    if (mode === 'In person') meetings = days.map((day) => ({ day, start, end: start + dur, location: room, mode: 'In person' as const }))
    else if (mode === 'Hybrid') meetings = days.map((day, k) => ({ day, start, end: start + dur, location: k === 0 ? room : 'Online', mode: (k === 0 ? 'In person' : 'Online') as 'In person' | 'Online' }))
    else if (mode === 'Online synchronous') meetings = days.map((day) => ({ day, start, end: start + dur, location: 'Online', mode: 'Online' as const }))
    out.push({
      section: String(i + 1).padStart(2, '0'),
      classNumber: 5000 + (s % 4000),
      kind: units <= 1 ? 'ACT' : 'LEC',
      mode,
      seats: (s >>> 15) % 4 === 0 ? 0 : (s >>> 17) % 26,
      waitlist: (s >>> 20) % 41,
      instructor: 'Staff',
      permission: false,
      requirement: 'Major',
      meetings,
    })
  }
  return out
}
