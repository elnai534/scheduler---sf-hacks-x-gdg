// Degree/major/minor compatibility for the manual-entry selects in Setup.
// Pure and UI-free so it can be unit tested.

export interface ProgramPick { career: string; degree: string; major: string; minor: string }

// Which majors each degree offers, limited to the options shown in Setup.
// Sources: Visual Communication Design-BS and Computer Science-MN come from
// src/dpr/fixtures/sample-dpr.txt; Computer Science as a B.S. was stated by the
// user (SF State offers CS as a B.S.). Industrial Design B.S. is ASSUMED.
// No listed major is a B.A., so Bachelor of Arts has no valid major here.
export const MAJORS_BY_DEGREE: Record<string, readonly string[]> = {
  'Bachelor of Science': ['Visual Communication Design', 'Industrial Design', 'Computer Science'],
  'Bachelor of Arts': [],
}

export const DEGREES = Object.keys(MAJORS_BY_DEGREE)

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
