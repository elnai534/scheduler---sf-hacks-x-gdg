import catalog from './data/courses.json'
import { SECTIONS } from './data/sections'
import { hasSampleSections, sampleSections } from './data/sampleSections'
import type { CourseNode } from './dag/types'

export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'
export const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export interface Meeting {
  day: Day
  start: number // minutes from midnight
  end: number
  location: string
  mode: 'In person' | 'Online'
}

export type CourseMode = 'Hybrid' | 'Online asynchronous' | 'Online synchronous' | 'In person' | 'Catalog only'
export const isOnline = (mode: CourseMode) => mode === 'Online asynchronous' || mode === 'Online synchronous'

export interface Course {
  code: string
  section: string
  title: string
  classNumber: number
  kind: 'LEC' | 'ACT'
  units: number
  mode: CourseMode
  seats: number
  waitlist: number
  instructor: string
  division: string
  permission: boolean
  meetings: Meeting[]
  requirement: 'Major' | 'SF State' | 'General Education'
  prereqText: string
  description: string
  node: CourseNode
}

/** Every course comes from the scraped bulletin catalog (src/data/courses.json). Section details overlay by code. */
export const CATALOG: Course[] = (catalog as CourseNode[]).flatMap((n): Course[] => {
  const base = {
    code: n.code, title: n.title, units: n.units ?? 3, prereqText: n.prereqText, description: n.description, node: n,
    division: Number(/\d+/.exec(n.code)![0]) >= 300 ? 'Upper Division' : 'Lower Division',
  }
  const sections = SECTIONS[n.code] ?? (hasSampleSections(n.code) ? sampleSections(n.code, n.units ?? 3) : undefined)
  if (!sections) {
    return [{ ...base, section: '01', classNumber: 0, kind: 'LEC' as const, mode: 'Catalog only' as const, seats: 0, waitlist: 0, instructor: 'TBA', permission: n.permissionWaiver, requirement: 'Major' as const, meetings: [] }]
  }
  return sections.map((x) => ({ ...base, ...x }))
})

/** Courses that have real-looking section info and can be placed on the calendar. */
export const SCHEDULABLE = CATALOG.filter((c) => c.mode !== 'Catalog only')

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
