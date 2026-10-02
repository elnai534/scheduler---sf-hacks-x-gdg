// Degree/major/minor compatibility for the manual-entry selects in Setup.
// Pure and UI-free so it can be unit tested.

export interface ProgramPick { career: string; degree: string; major: string; minor: string }

// Which majors each degree offers, limited to the options shown in Setup.
// Verified 2026-10-02 against the SF State Bulletin (bulletin.sfsu.edu):
//   Visual Communication Design: only "Bachelor of Science in Visual Communication Design"
//   Industrial Design: only "Bachelor of Science in Industrial Design: Concentration in Product Design and Development"
//   Computer Science: only "Bachelor of Science in Computer Science"
// None of the three offered majors is a B.A., so Bachelor of Arts is NOT an option
// (the Bulletin's B.A. in General Biology exists but Biology is not an offered major here).
export const MAJORS_BY_DEGREE: Record<string, readonly string[]> = {
  'Bachelor of Science': ['Visual Communication Design', 'Industrial Design', 'Computer Science'],
}

export const DEGREES: readonly string[] = Object.keys(MAJORS_BY_DEGREE)
export const MAJORS: readonly string[] = [...new Set(Object.values(MAJORS_BY_DEGREE).flat())]
// Bulletin minors: "Minor in Computer Science", "Minor in General Biology" (shown as Biology).
export const MINORS: readonly string[] = ['Computer Science', 'Biology']

export function validMajor(degree: string, major: string): boolean {
  return !degree || !major || (MAJORS_BY_DEGREE[degree] ?? []).includes(major)
}

// A minor cannot duplicate the declared major (ASSUMED rule).
export function validMinor(major: string, minor: string): boolean {
  return !major || !minor || major !== minor
}

export const degreeEnabled = (p: ProgramPick, degree: string) => validMajor(degree, p.major)
export const majorEnabled = (p: ProgramPick, major: string) => validMajor(p.degree, major) && validMinor(major, p.minor)
export const minorEnabled = (p: ProgramPick, minor: string) => validMinor(p.major, minor)

// Apply a change to one field, then clear any other field that became invalid.
export function applyChange(p: ProgramPick, key: keyof ProgramPick, value: string): ProgramPick {
  const next = { ...p, [key]: value }
  if (key !== 'major' && !validMajor(next.degree, next.major)) next.major = ''
  if (key !== 'minor' && !validMinor(next.major, next.minor)) next.minor = ''
  if (key === 'major' && !validMajor(next.degree, next.major)) next.degree = ''
  return next
}
