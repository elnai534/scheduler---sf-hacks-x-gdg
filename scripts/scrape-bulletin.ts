// Usage: node scripts/scrape-bulletin.ts des csc   -> writes src/data/courses.json
import { writeFileSync } from 'node:fs'
import { parseBulletinHtml } from '../src/dag/parse.ts'
import type { CourseNode } from '../src/dag/types.ts'

const depts = process.argv.slice(2)
if (!depts.length) throw new Error('Pass department slugs, e.g. des csc')
const all: CourseNode[] = []
for (const d of depts) {
  const res = await fetch(`https://bulletin.sfsu.edu/courses/${d}/`, { headers: { 'User-Agent': 'Mozilla/5.0 (schedule-studio scraper)' } })
  if (!res.ok) throw new Error(`${d}: HTTP ${res.status}`)
  const courses = parseBulletinHtml(await res.text())
  console.log(`${d}: ${courses.length} courses`)
  all.push(...courses)
}
writeFileSync(new URL('../src/data/courses.json', import.meta.url), JSON.stringify(all, null, 1) + '\n')
console.log(`wrote ${all.length} courses`)
