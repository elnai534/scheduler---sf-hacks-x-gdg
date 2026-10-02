import { useState } from 'react'
import { usePersisted } from './lib/persist'
import Header from './components/Header'
import type { Step } from './components/Header'
import Build from './pages/Build'
import Degree from './pages/Degree'
import Review from './pages/Review'
import Pathway from './pages/Pathway'
import type { DprReport } from './dpr/types'
import Setup from './pages/Setup'
import type { Program } from './pages/Setup'
import { CATALOG, SCHEDULABLE, byId, cid, conflictsWith } from './data'
import { recommend } from './recommend/recommend'
import type { Prefs, Recommendation } from './recommend/recommend'
import type { Course } from './data'

export default function App() {
  const [step, setStep] = useState<Step>('pathway')
  const [program, setProgram] = usePersisted<Program>('program', { career: '', degree: '', major: '', minor: '' })
  const [report, setReport] = usePersisted<DprReport | null>('report', null)
  const [openTab, setOpenTab] = useState<'plan' | 'courses' | 'gemini'>('plan')
  const [ids, setIds] = usePersisted<string[]>('ids', [])
  const [priorities, setPriorities] = usePersisted('priorities', ['Major Requirements', 'SF State Requirements', 'Consolidate campus days', 'General Education Requirements'])

  const accepted = ids.map(byId).filter((c): c is Course => Boolean(c))

  const toggle = (c: Course) => setIds((cur) => (cur.includes(cid(c)) ? cur.filter((x) => x !== cid(c)) : [...cur, cid(c)]))
  const apply = (add: Course[], remove: string[]) =>
    setIds((cur) => [...cur.filter((x) => !remove.includes(x)), ...add.map(cid).filter((x) => !cur.includes(x) || remove.includes(x))])

  function generate(prefs: Prefs): Recommendation | string {
    if (report) {
      const r = recommend(report, CATALOG, prefs)
      setIds(r.picks.map((x) => cid(x.section)))
      return r
    }
    // No report: simple fallback so the button still works.
    const blocked = prefs.days.length ? DAYS_ALL.filter((d) => !prefs.days.includes(d)) : []
    const picked: Course[] = []
    let units = 0
    for (const code of [...new Set(SCHEDULABLE.map((c) => c.code))]) {
      if (units >= (prefs.targetUnits || 12)) break
      const opt = SCHEDULABLE.find((c) => c.code === code && !conflictsWith(c, picked) && !c.meetings.some((m) => blocked.includes(m.day)) && (!prefs.onlineOnly || c.mode.startsWith('Online')))
      if (opt && units + opt.units <= (prefs.targetUnits || 12)) { picked.push(opt); units += opt.units }
    }
    setIds(picked.map(cid))
    return `Proposed ${picked.length} sections, ${units} units.`
  }

  return (
    <div className="min-h-screen">
      <Header step={step} onStep={setStep} />
      {step === 'pathway' && <Pathway onNext={() => setStep('setup')} />}
      {step === 'setup' && <Setup program={program} setProgram={setProgram} onBack={() => setStep('pathway')} onNext={() => setStep('degree')} onReport={setReport} />}
      {step === 'degree' && <Degree report={report} program={program} onNext={() => { setOpenTab('plan'); setStep('build') }} onBrowse={() => { setOpenTab('courses'); setStep('build') }} />}
      {/* Always mounted (hidden off-step) so tab, preferences, filters and chat survive switching steps. */}
      <div hidden={step !== 'build'}>
        <Build report={report} tab={openTab} setTab={setOpenTab} accepted={accepted} onToggle={toggle} onApply={apply} onGenerate={generate} onReview={() => setStep('review')}
          priorities={priorities} setPriorities={setPriorities} />
      </div>
      {step === 'review' && <Review courses={accepted} onBack={() => setStep('build')} />}
    </div>
  )
}

const DAYS_ALL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
