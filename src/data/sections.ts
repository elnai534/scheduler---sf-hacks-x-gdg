import type { Meeting } from '../data'

/**
 * Sample section data (times, seats, rooms). The bulletin catalog (courses.json) has none of this,
 * so these overlay the scraped courses by code. Replace with real class-search data when available.
 */
export interface SectionInfo {
  section: string
  classNumber: number
  kind: 'LEC' | 'ACT'
  mode: 'Hybrid' | 'Online asynchronous' | 'In person'
  seats: number
  waitlist: number
  instructor: string
  permission: boolean
  requirement: 'Major' | 'SF State' | 'General Education'
  meetings: Meeting[]
}

const t = (h: number, m = 0) => h * 60 + m
const burk = (mode: 'In person' | 'Online' = 'In person') => (day: 'Tue' | 'Thu', s: number, e: number): Meeting =>
  ({ day, start: s, end: e, location: mode === 'Online' ? 'Online' : 'Burk Hall 237', mode })

export const SECTIONS: Record<string, SectionInfo[]> = {
  'DES 200': [
    { section: '01', classNumber: 4384, kind: 'LEC', mode: 'Hybrid', seats: 1, waitlist: 40, instructor: 'Debra Glass', permission: true, requirement: 'Major',
      meetings: [burk()('Tue', t(9, 30), t(10, 45)), burk('Online')('Thu', t(9, 30), t(10, 45))] },
    { section: '02', classNumber: 4385, kind: 'LEC', mode: 'Hybrid', seats: 0, waitlist: 40, instructor: 'Debra Glass', permission: true, requirement: 'Major',
      meetings: [burk()('Tue', t(11), t(12, 15)), burk('Online')('Thu', t(11), t(12, 15))] },
  ],
  'DES 222': [
    { section: '01', classNumber: 4049, kind: 'ACT', mode: 'Online asynchronous', seats: 1, waitlist: 60, instructor: 'Julia Ayana Airakan-Mance', permission: true, requirement: 'Major', meetings: [] },
    { section: '02', classNumber: 7832, kind: 'ACT', mode: 'Online asynchronous', seats: 0, waitlist: 60, instructor: 'Staff', permission: false, requirement: 'Major', meetings: [] },
  ],
  'DES 226': [
    { section: '01', classNumber: 7769, kind: 'ACT', mode: 'In person', seats: 0, waitlist: 18, instructor: 'Staff', permission: false, requirement: 'Major',
      meetings: [{ day: 'Fri', start: t(9), end: t(11, 45), location: 'Creative Arts 140', mode: 'In person' }] },
  ],
  'BIOL 318': [
    { section: '01', classNumber: 4543, kind: 'LEC', mode: 'In person', seats: 12, waitlist: 0, instructor: 'Staff', permission: false, requirement: 'General Education',
      meetings: [
        { day: 'Tue', start: t(12), end: t(14), location: 'Hensill Hall 112', mode: 'In person' },
        { day: 'Thu', start: t(12), end: t(14), location: 'Hensill Hall 112', mode: 'In person' },
      ] },
  ],
  'AIS 460': [
    { section: '01', classNumber: 4543, kind: 'LEC', mode: 'In person', seats: 8, waitlist: 0, instructor: 'Staff', permission: false, requirement: 'SF State',
      meetings: [{ day: 'Wed', start: t(11), end: t(13), location: 'Humanities 405', mode: 'In person' }] },
  ],
}
