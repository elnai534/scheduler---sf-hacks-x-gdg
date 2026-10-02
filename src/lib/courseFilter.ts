export type Level = 'Lower Division' | 'Upper Division' | 'Graduate'
export const LEVELS: Level[] = ['Lower Division', 'Upper Division', 'Graduate']

/** SF State numbering: 100-299 lower, 300-699 upper, 700+ graduate. */
export const levelOf = (code: string): Level => {
  const n = Number(/\d+/.exec(code)?.[0] ?? 0)
  return n >= 700 ? 'Graduate' : n >= 300 ? 'Upper Division' : 'Lower Division'
}

export const subjectOf = (code: string) => code.trim().split(/\s+/)[0] ?? ''

export interface CourseFilter { q: string; level: Level | ''; subject: string }
export const EMPTY_FILTER: CourseFilter = { q: '', level: '', subject: '' }
export const isFiltered = (f: CourseFilter) => !!(f.q.trim() || f.level || f.subject)

/** Pure predicate over anything with code + title. Search matches code or title, case-insensitive. */
export const matchesCourse = (c: { code: string; title: string }, f: CourseFilter) => {
  const q = f.q.trim().toLowerCase()
  return (!q || `${c.code} ${c.title}`.toLowerCase().includes(q)) &&
    (!f.level || levelOf(c.code) === f.level) &&
    (!f.subject || subjectOf(c.code) === f.subject)
}

export const filterCourses = <T extends { code: string; title: string }>(cs: T[], f: CourseFilter): T[] => cs.filter((c) => matchesCourse(c, f))
