/** One AND-clause of a prerequisite: satisfied if ANY code in `anyOf` is done (or an `alt` condition holds). */
export interface PrereqGroup {
  anyOf: string[]
  /** Non-course alternatives, e.g. "graduate standing", "permission of the instructor". */
  alt: string[]
}

export interface CourseNode {
  code: string
  title: string
  units: number | null
  /** AND of ORs over course codes that must be completed first. */
  prereqGroups: PrereqGroup[]
  /** Courses that must be taken at the same time. Never creates DAG edges. */
  coreqs: string[]
  /** Prerequisite codes the bulletin says may be taken concurrently. Never creates DAG edges. */
  concurrentOk: string[]
  /** Prerequisite text that isn't a course (major restrictions, standing, placement...). */
  notes: string[]
  permissionWaiver: boolean
  prereqText: string
  /** Catalog description, used for skill/topic matching. */
  description: string
}
