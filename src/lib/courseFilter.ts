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

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '')

/** Pure predicate over anything with code + title. Search matches code or title, ignoring case and spaces ("csc210" finds "CSC 210"). */
export const matchesCourse = (c: { code: string; title: string }, f: CourseFilter) => {
  const q = squash(f.q)
  return (!q || squash(`${c.code} ${c.title}`).includes(q)) &&
    (!f.level || levelOf(c.code) === f.level) &&
    (!f.subject || subjectOf(c.code) === f.subject)
}

export const filterCourses = <T extends { code: string; title: string }>(cs: T[], f: CourseFilter): T[] => cs.filter((c) => matchesCourse(c, f))

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

/** "Begins at/after" / "Ends at/before" ("HH:MM", empty = no limit). Every meeting must fit; a course with no meeting times can't be shown to fit. */
export const meetsTimeWindow = (meetings: { start: number; end: number }[], after: string, before: string) =>
  (!after && !before) || (meetings.length > 0 && meetings.every((m) => (!after || m.start >= toMin(after)) && (!before || m.end <= toMin(before))))
