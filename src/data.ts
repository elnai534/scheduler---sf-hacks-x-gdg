export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'
export const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export interface Meeting {
  day: Day
  start: number // minutes from midnight
  end: number
  location: string
  mode: 'In person' | 'Online'
}

export interface Course {
  code: string
  section: string
  title: string
  classNumber: number
  kind: 'LEC' | 'ACT'
  units: number
  mode: 'Hybrid' | 'Online asynchronous' | 'In person'
  seats: number
  waitlist: number
  instructor: string
  division: string
  permission: boolean
  meetings: Meeting[]
  requirement: 'Major' | 'SF State' | 'General Education'
}

const t = (h: number, m = 0) => h * 60 + m

export const CATALOG: Course[] = [
  {
    code: 'DES 200', section: '01', title: 'Visual Design Literacy', classNumber: 4384, kind: 'LEC', units: 3,
    mode: 'Hybrid', seats: 1, waitlist: 40, instructor: 'Debra Glass', division: 'Lower Division', permission: true,
    requirement: 'Major',
    meetings: [
      { day: 'Tue', start: t(9, 30), end: t(10, 45), location: 'Burk Hall 237', mode: 'In person' },
      { day: 'Thu', start: t(9, 30), end: t(10, 45), location: 'Online', mode: 'Online' },
    ],
  },
  {
    code: 'DES 200', section: '02', title: 'Visual Design Literacy', classNumber: 4385, kind: 'LEC', units: 3,
    mode: 'Hybrid', seats: 0, waitlist: 40, instructor: 'Debra Glass', division: 'Lower Division', permission: true,
    requirement: 'Major',
    meetings: [
      { day: 'Tue', start: t(11), end: t(12, 15), location: 'Burk Hall 237', mode: 'In person' },
      { day: 'Thu', start: t(11), end: t(12, 15), location: 'Online', mode: 'Online' },
    ],
  },
  {
    code: 'DES 222', section: '01', title: 'Digital Design Foundations I', classNumber: 4049, kind: 'ACT', units: 3,
    mode: 'Online asynchronous', seats: 1, waitlist: 60, instructor: 'Julia Ayana Airakan-Mance', division: 'Lower Division',
    permission: true, requirement: 'Major', meetings: [],
  },
  {
    code: 'DES 222', section: '02', title: 'Digital Design Foundations I', classNumber: 7832, kind: 'ACT', units: 3,
    mode: 'Online asynchronous', seats: 0, waitlist: 60, instructor: 'Staff', division: 'Lower Division',
    permission: false, requirement: 'Major', meetings: [],
  },
  {
    code: 'DES 226', section: '01', title: 'Modern Letterpress Printing: Traditional and Digital Techniques', classNumber: 7769,
    kind: 'ACT', units: 3, mode: 'In person', seats: 0, waitlist: 18, instructor: 'Staff', division: 'Lower Division',
    permission: false, requirement: 'Major',
    meetings: [
      { day: 'Fri', start: t(9), end: t(11, 45), location: 'Creative Arts 140', mode: 'In person' },
    ],
  },
  {
    code: 'BIOL 318', section: '01', title: 'Our Endangered Planet', classNumber: 4543, kind: 'LEC', units: 3,
    mode: 'In person', seats: 12, waitlist: 0, instructor: 'Staff', division: 'Upper Division', permission: false,
    requirement: 'General Education',
    meetings: [
      { day: 'Tue', start: t(12), end: t(14), location: 'Hensill Hall 112', mode: 'In person' },
      { day: 'Thu', start: t(12), end: t(14), location: 'Hensill Hall 112', mode: 'In person' },
    ],
  },
  {
    code: 'AIS 460', section: '01', title: 'American Indian Politics', classNumber: 4543, kind: 'LEC', units: 3,
    mode: 'In person', seats: 8, waitlist: 0, instructor: 'Staff', division: 'Upper Division', permission: false,
    requirement: 'SF State',
    meetings: [{ day: 'Wed', start: t(11), end: t(13), location: 'Humanities 405', mode: 'In person' }],
  },
]

export const cid = (c: Course) => `${c.code} [${c.section}]`
export const byId = (id: string) => CATALOG.find((c) => cid(c) === id)

export const fmt = (m: number) => {
  const h = Math.floor(m / 60)
  const mm = m % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`
}
export const range = (s: number, e: number) => `${fmt(s).replace(' AM', '').replace(' PM', '')}–${fmt(e)}`

export const overlaps = (a: Meeting, b: Meeting) => a.day === b.day && a.start < b.end && b.start < a.end

export function countConflicts(courses: Course[]): number {
  let n = 0
  for (let i = 0; i < courses.length; i++)
    for (let j = i + 1; j < courses.length; j++)
      if (courses[i].meetings.some((a) => courses[j].meetings.some((b) => overlaps(a, b)))) n++
  return n
}

export function conflictsWith(course: Course, others: Course[]): boolean {
  return others.some((o) => cid(o) !== cid(course) && o.meetings.some((a) => course.meetings.some((b) => overlaps(a, b))))
}

export const REQUIREMENTS = [
  { name: 'Major requirements', done: 42, total: 48 },
  { name: 'General education', done: 42, total: 48 },
  { name: 'University requirements', done: 42, total: 48 },
]
