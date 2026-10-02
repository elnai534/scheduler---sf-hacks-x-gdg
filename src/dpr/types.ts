export type CourseStatus = 'completed' | 'inProgress' | 'transfer' | 'unknown'

export interface DprCourse {
  code: string
  title: string
  units: number
  /** "Fall 2026" for a student's own course; "Fall, Spring" style offering pattern for a candidate. */
  when: string
  grade: string
  status: CourseStatus | 'candidate'
}

export interface DprRequirement {
  /** e.g. "R11957/L0020" */
  id: string
  name: string
  /** Enclosing requirement group, e.g. "Foundation Requirements". */
  group: string
  /** Enclosing program/section, e.g. "B.S. in Visual Communication Design". */
  section: string
  kind: 'units' | 'courses' | 'gpa' | null
  required: number
  taken: number
  needed: number
  /** 'open' = still needs work; 'filled' = covered by courses on the report; 'unknown' = collapsed or unreadable. */
  status: 'open' | 'filled' | 'unknown'
  satisfiedBy: DprCourse[]
  /** Courses that could satisfy it (offering pattern, not taken). */
  options: DprCourse[]
  /** Total options per the report ("1-10 of 38") — more than options.length means the paste was truncated. */
  optionsTotal: number | null
  notes: string[]
}

export interface DprReport {
  career: string
  program: string
  plans: string[]
  lastTerm: string
  requirements: DprRequirement[]
  /** Every distinct course the student has (completed, in progress, transfer). */
  courses: DprCourse[]
  /** Warnings the UI should show, e.g. truncated lists. */
  warnings: string[]
}
