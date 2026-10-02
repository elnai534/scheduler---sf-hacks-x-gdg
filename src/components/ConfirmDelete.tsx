import { useEffect, useRef, useState } from 'react'
import type { Course } from '../data'
import { cid } from '../data'

/** Shared "delete this course?" dialog used by every remove-from-schedule entry point. */
export default function ConfirmDelete({ course, onConfirm, onCancel }: { course: Course; onConfirm: (remember: boolean) => void; onCancel: () => void }) {
  const [remember, setRemember] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => prev?.focus?.()
  }, [])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel(); return }
    if (e.key !== 'Tab') return
    const f = boxRef.current?.querySelectorAll<HTMLElement>('button, input')
    if (!f?.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }} onKeyDown={onKeyDown}>
      <div ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" className="w-[380px] rounded-xl bg-white p-5 shadow-xl">
        <h3 id="confirm-delete-title" className="flex items-center gap-2 text-lg font-bold"><span className="icon text-2xl text-red-700">delete</span>Delete this course?</h3>
        <div className="mt-2 text-sm font-semibold">{cid(course)} · {course.title}</div>
        <p className="mt-1 text-sm text-slate-600">It will be removed from your selected schedule.</p>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[#2d1b69]" />Remember my choice</label>
        <div className="mt-4 flex justify-end gap-2">
          <button ref={cancelRef} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={() => onConfirm(remember)} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Delete</button>
        </div>
      </div>
    </div>
  )
}
