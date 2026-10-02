# GEMINI.md — SF Hacks x GDG Course Scheduler

Context for the Gemini CLI. Everything below was checked against the files in
this repo; anything marked "unknown" was not found.

## What this is

A course scheduler for SFSU students, built for the SF Hacks x GDG hackathon.
A student walks a flow (pathway -> setup -> degree -> build -> review), gets a
proposed schedule, and can tweak it with an "Ask Gemini" chat that adds or
removes sections. This directory (`scheduler/`) is the git root
(`origin`: https://github.com/elnai534/scheduler---sf-hacks-x-gdg).

## Stack

- React 19 + TypeScript (`~6.0`, strict-ish: `noUnusedLocals`,
  `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`)
- Vite 8 (`vite.config.ts`: dev port 3000, `strictPort`, `host: true`)
- Tailwind CSS v4 via `@tailwindcss/vite` (styles in `src/index.css`)
- Google Fonts (Inter) and Material Symbols Outlined icons, both loaded via
  `<link>` in `index.html`
- Lint: `oxlint` (`.oxlintrc.json`). `vitest` is installed; tests exist only in `src/dag/`.
- Gemini: direct REST call from the browser, `src/lib/gemini.ts`
  (default model `gemini-2.5-flash`, override `VITE_GEMINI_MODEL`)

## Directory map

```
index.html              fonts/icons links, mounts #root
src/main.tsx            React entry
src/App.tsx             all app state, step routing, schedule generator, apply()
src/data.ts             HARDCODED course catalog (CATALOG) + helpers
src/index.css           Tailwind entry
src/pages/              one file per step: Pathway, Setup, Degree, Build, Review
src/components/         Header, Calendar, PlanTab, CoursesTab, GeminiTab
src/lib/gemini.ts       askGeminiJson<T>(system, user)
src/dag/                bulletin prerequisite parser (types.ts, parse.ts,
                        graph.ts, fixtures/*.mini.html)
src/data/courses.json   scraper output (prereq data); no src import found
scripts/scrape-bulletin.ts   fetches bulletin.sfsu.edu, writes courses.json
scripts/set-secret.sh        stores API key in .env.local (hidden prompt)
design/                 Figma screenshots (a_ ... f_*.png)
public/, dist/          static assets / build output (dist is gitignored)
```

Key file: `src/data.ts` exports `Course`, `Meeting`, `CATALOG`, `DAYS`,
`cid(c)` (id string like `"DES 200 [01]"`), `byId`, `fmt`, `range`,
`overlaps`, `countConflicts`, `conflictsWith`, `REQUIREMENTS`. Times are
minutes from midnight (`t(h, m)` helper). A `Course` is one section:
code, section, title, classNumber, kind (`LEC`/`ACT`), units, mode, seats,
waitlist, instructor, division, permission, meetings[], requirement
(`Major` / `SF State` / `General Education`).

## Commands

Run from `scheduler/`.

```bash
npm run dev       # vite dev server on :3000
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview
```

Deploy: GitHub Pages, `gh-pages` branch, deployed manually (no deploy script
or `gh-pages` dependency in `package.json`). Build with the Pages base path:

```bash
BASE=/scheduler---sf-hacks-x-gdg/ npm run build
```

`vite.config.ts` reads `process.env.BASE` (default `/`).

Secrets: `VITE_GEMINI_API_KEY` lives in `.env.local` (gitignored). Never
print, commit, or paste its value. `scripts/set-secret.sh` sets it. Restart
the dev server after changing it.

Scraper (optional): `node scripts/scrape-bulletin.ts des csc` rewrites
`src/data/courses.json`.

## Conventions observed

- Function components with hooks; app state is lifted into `App.tsx` and
  passed down as props (no state library, no router, no context).
- Pages/components use default exports; `data.ts` uses named exports.
- Styling is Tailwind utility classes inline; no CSS modules.
- Course identity is the string `cid(c)`; selected schedule = `ids: string[]`.
- Single-quote, no-semicolon style, 2-space indent.
- `import type` for type-only imports (required by `verbatimModuleSyntax`).

## Design sources

- Figma: https://www.figma.com/design/aakwm70Y9FYPmLTTAvXIY8/SF-Hacks-x-GDG
- Screenshots saved in `design/` (six PNGs named by frame, e.g.
  `e_36-951_filters.png`, `f_26-628_requirements.png`)
- Magic Patterns render:
  https://9c508540-e81b-4ec4-87ae-38d37d787f24-render.magicpatterns.app/student-type
- Git history says the UI was built from Figma "HERE" frames, then matched to
  the Magic Patterns flow.

## Standing decisions

- Courses are intentionally hardcoded in `src/data.ts`. Do not replace them
  with fetched data unless asked.
- Keep the schedule generator (`generate()` in `App.tsx`) and the
  Gemini-apply logic (`apply()` in `App.tsx`, `GeminiTab.tsx`) minimal. Avoid
  complex logic until requirements are solid.
- Optional stretch goal: an SFSU course catalog scraper that replaces
  `data.ts`. Partial groundwork (bulletin prereq scraper + `src/dag/`) exists
  but covers prerequisites only, not sections/times; it is not wired in.
- Hard 2-hour hackathon deadline: favor simple defaults, no
  over-engineering, no new dependencies without a reason.
- Push to GitHub (`elnai534/scheduler---sf-hacks-x-gdg`) after each success
  (a working change that builds).

## Unknown / not found

- Deploy command for `gh-pages` (done manually; no script in repo).
- Automated tests: only `src/dag/*.test.ts` (vitest) exist; `package.json` has
  no `test` script, so run `npx vitest run src/dag` (not run by me).
- Whether `src/dag/` or `courses.json` is used by the UI: resolved, it is not.
  Grep of `src/` outside `src/dag/` finds no import of either (only
  `scripts/scrape-bulletin.ts` and `src/dag/real-data.test.ts` use them).

## Running the prerequisite DAG: heuristics

Checked by reading `src/dag/`, `scripts/scrape-bulletin.ts` and sampling
`src/data/courses.json` (452 courses: BIOL 163, CSC 99, MATH 93, DES 64, AIS 33).
The DAG is standalone; the UI does not use it.

- Prereqs are `prereqGroups`: AND of groups, each group an OR (`anyOf` codes)
  plus `alt` strings for non-course alternatives (verified in src/dag/types.ts, parse.ts)
- Coreqs ("concurrent enrollment in X") go in `coreqs`; `eligibility()` never
  checks them and they create no edges (verified in src/dag/graph.ts, types.ts)
- Prereqs marked "(may be taken concurrently)" go in `concurrentOk` and are
  removed from `prereqGroups`; `eligibility()` re-adds them as unmet unless
  completed or in `inProgress` (verified in src/dag/parse.ts, graph.ts)
- Edges: every `anyOf` code gives an edge to the course, tagged `or` when the
  group has >1 code else `and`; AND/OR structure is lost in edges, so use
  `eligibility()` for real checks, not edge lists (verified in src/dag/graph.ts)
- Cycles: `findCycle` returns one cycle `[a,...,a]` or null; `topoSort` throws
  `Cycle: ...`; self-references are dropped. The saved data is acyclic per
  a test I read but did not run (verified in src/dag/graph.ts, real-data.test.ts)
- Unknown courses: a referenced but unscraped code becomes a `null` node.
  Sample data has 20 such codes, e.g. `CHEM 101`, `BIOL 492` (verified in
  src/dag/graph.ts, src/data/courses.json)
- Unknown-course eligibility: an unscraped code just never counts as done
  unless the caller puts it in `completed` (verified in src/dag/graph.ts)
- Ordering: `topoSort` is Kahn's algorithm, ready nodes in alphabetical code
  order (re-sorted after each push); `allPrereqs` ignores AND/OR and returns
  all transitive prereqs sorted (verified in src/dag/graph.ts)
- `availableCourses` filters out completed courses and returns catalog order,
  with no ranking or priority (verified in src/dag/graph.ts)
- Non-course conditions (major restrictions, standing, instructor permission)
  land in `notes` / `permissionWaiver`; `eligibility()` does not block on them
  and only sets `needsHumanCheck` (verified in src/dag/graph.ts, parse.ts)
- Scraper data: 101 of 452 courses have empty `prereqText`; 192 have
  `permissionWaiver: true`; 21 have `coreqs`, 18 `concurrentOk`; `units` is
  never null in the sample (0-6, mostly 3). Units come from the title's
  "(Units: N)" and take the first number of a range (verified in
  src/data/courses.json, src/dag/parse.ts)
- Odd text: `;` splits clauses, `with a grade of X or better` and `or
  equivalent` are stripped, `*` removed, "recommended" coreqs go to `notes`.
  Example: DES 278 "DES 200 * and DES 222 *" parses with a note (verified
  in src/dag/parse.ts, courses.json)
- Scraper fetches `https://bulletin.sfsu.edu/courses/<dept>/` per dept slug,
  overwrites the whole JSON, throws on non-200 (verified in scripts/scrape-bulletin.ts)
- Unit or semester load limits, term offering, section times, cross-listing:
  none in `src/dag/` or the JSON (unknown)
