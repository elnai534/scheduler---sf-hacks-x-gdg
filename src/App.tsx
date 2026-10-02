import { useState } from 'react'
import Header from './components/Header'
import type { Step } from './components/Header'
import Build from './pages/Build'
import Degree from './pages/Degree'
import Review from './pages/Review'
import Pathway from './pages/Pathway'
import type { DprReport } from './dpr/types'
import Setup from './pages/Setup'
import type { Program } from './pages/Setup'
import { SCHEDULABLE, byId, cid, conflictsWith } from './data'
import type { Course } from './data'

const RANK: Record<string, string> = { Major: 'Major Requirements', 'SF State': 'SF State Requirements', 'General Education': 'General Education Requirements' }

export default function App() {
  const [step, setStep] = useState<Step>('pathway')
  const [program, setProgram] = useState<Program>({ career: 'Undergraduate', degree: 'Bachelor of Science', major: 'Visual Communication Design', minor: 'None declared' })
  const [report, setReport] = useState<DprReport | null>(null)
  const [openTab, setOpenTab] = useState<'plan' | 'courses' | 'gemini'>('plan')
  const [ids, setIds] = useState<string[]>(['DES 200 [01]', 'DES 222 [01]'])
  const [targetUnits, setTargetUnits] = useState('')
  const [unavailable, setUnavailable] = useState('')
  const [priorities, setPriorities] = useState(['Major Requirements', 'SF State Requirements', 'Consolidate campus days', 'General Education Requirements'])

  const accepted = ids.map(byId).filter((c): c is Course => Boolean(c))

  const toggle = (c: Course) => setIds((cur) => (cur.includes(cid(c)) ? cur.filter((x) => x !== cid(c)) : [...cur, cid(c)]))
  const apply = (add: Course[], remove: string[]) =>
    setIds((cur) => [...cur.filter((x) => !remove.includes(x)), ...add.map(cid).filter((x) => !cur.includes(x) || remove.includes(x))])

  function generate(): string {
    const blocked = DAYS_FROM(unavailable)
    const target = parseInt(targetUnits, 10) || 12
    const codes = [...new Set(SCHEDULABLE.map((c) => c.code))].sort((a, b) => {
      const ra = priorities.indexOf(RANK[SCHEDULABLE.find((c) => c.code === a)!.requirement])
      const rb = priorities.indexOf(RANK[SCHEDULABLE.find((c) => c.code === b)!.requirement])
      return ra - rb
    })
    const picked: Course[] = []
    let units = 0
    for (const code of codes) {
      if (units >= target) break
      const days = new Set(picked.flatMap((c) => c.meetings.map((m) => m.day)))
      const options = SCHEDULABLE.filter((c) => c.code === code && !conflictsWith(c, picked) && !c.meetings.some((m) => blocked.includes(m.day)))
      options.sort((a, b) => {
        const score = (c: Course) => (c.seats > 0 ? 0 : 10) + c.meetings.filter((m) => !days.has(m.day)).length * (priorities.indexOf('Consolidate campus days') < 3 ? 1 : 0)
        return score(a) - score(b)
      })
      if (options[0] && units + options[0].units <= Math.max(target, units + options[0].units)) {
        picked.push(options[0])
        units += options[0].units
      }
    }
    setIds(picked.map(cid))
    return `Proposed ${picked.length} sections, ${units} units${blocked.length ? `, avoiding ${blocked.join('/')}` : ''}. Review the calendar, then accept or tweak with Ask Gemini.`
  }

  return (
    <div className="min-h-screen">
      <Header step={step} onStep={setStep} />
      {step === 'pathway' && <Pathway onNext={() => setStep('setup')} />}
      {step === 'setup' && <Setup program={program} setProgram={setProgram} onBack={() => setStep('pathway')} onNext={() => setStep('degree')} onReport={setReport} />}
      {step === 'degree' && <Degree report={report} program={program} onNext={() => { setOpenTab('plan'); setStep('build') }} onBrowse={() => { setOpenTab('courses'); setStep('build') }} />}
      {step === 'build' && (
        <Build report={report} initialTab={openTab} accepted={accepted} onToggle={toggle} onApply={apply} onGenerate={generate} onReview={() => setStep('review')}
          targetUnits={targetUnits} setTargetUnits={setTargetUnits} unavailable={unavailable} setUnavailable={setUnavailable}
          priorities={priorities} setPriorities={setPriorities} />
      )}
      {step === 'review' && <Review courses={accepted} onBack={() => setStep('build')} />}
    </div>
  )
}

function DAYS_FROM(text: string): string[] {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].filter((d) => text.toLowerCase().includes(d.toLowerCase()))
}
