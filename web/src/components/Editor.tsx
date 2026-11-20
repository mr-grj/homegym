import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { RoutineRecord } from '../api'
import { clock } from '../format'
import { parseDoc, parseRoutine, serializeDoc, totalSeconds, uniqueTitle, withTitle, written, type Draft } from '../routine'
import { usePersistent } from '../store'
import { blankPlan, Builder, toPlan, type Change, type Plan } from './Builder'
import { tip } from './Tooltips'

const TEMPLATE = `# New routine

## Warm-up
Jumping jacks 30s
~ Rest 10s

## Circuit ×3
Push-ups 40s
> knees down if needed
~ Rest 20s
Squats 40s
~ Rest 20s
`

type Mode = 'builder' | 'text'
type Snapshot = { source: string; plan: Plan | null }

type Props = {
  record: RoutineRecord | null
  titles: string[]
  library: Draft[]
  onSave: (source: string) => Promise<void>
  onSaveAsNew: (source: string) => Promise<void>
  onDelete: () => void
  onToast: (text: string | null, undo?: () => void) => void
}

export function Editor({ record, titles, library, onSave, onSaveAsNew, onDelete, onToast }: Props) {
  const [mode, setMode] = usePersistent<Mode>('homegym.editor', 'builder')
  const [initial] = useState(() => record?.source ?? (mode === 'text' ? TEMPLATE : ''))
  const [source, setSource] = useState(initial)
  const [plan, setPlan] = useState<Plan | null>(() => (record || mode === 'text' ? null : blankPlan()))
  const [busy, setBusy] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const history = useRef({ past: [] as Snapshot[], future: [] as Snapshot[], key: '', at: 0 })
  const shown = useMemo(() => plan ?? toPlan(parseDoc(source)), [plan, source])
  const routine = useMemo(() => parseRoutine(source), [source])
  const total = totalSeconds(routine.steps)

  const copyTitle = uniqueTitle(routine.title, titles)
  const canSave = !busy && routine.steps.length > 0

  useEffect(() => {
    if (!root.current?.contains(document.activeElement)) root.current?.focus({ preventScroll: true })
  }, [mode])

  const save = async () => {
    if (!canSave) return
    setBusy(true)
    await onSave(source).finally(() => setBusy(false))
  }

  const saveAsNew = async () => {
    if (!canSave || !record) return
    setBusy(true)
    await onSaveAsNew(copyTitle === routine.title ? source : withTitle(source, copyTitle)).finally(() => setBusy(false))
  }

  const restore = (from: Snapshot[], to: Snapshot[]) => {
    const snapshot = from.pop()
    if (!snapshot) return
    to.push({ source, plan: shown })
    history.current.key = ''
    setSource(snapshot.source)
    setPlan(snapshot.plan)
    onToast(null)
  }
  const undo = () => restore(history.current.past, history.current.future)
  const redo = () => restore(history.current.future, history.current.past)
  const latestUndo = useRef(undo)
  latestUndo.current = undo

  const build = (next: Plan, change?: Change) => {
    const h = history.current
    const now = Date.now()
    const merge = change?.key === h.key && (h.key.startsWith('drag') || now - h.at < 1500)
    if (!change?.key || !merge) h.past.push({ source, plan: shown })
    h.key = change?.key ?? ''
    h.at = now
    h.future = []
    setPlan(next)
    setSource(serializeDoc(next))
    if (change?.removed) onToast(`Removed “${change.removed}”`, () => latestUndo.current())
    else onToast(null)
  }

  const write = (text: string) => {
    setSource(text)
    setPlan(null)
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return
    history.current = { past: [], future: [], key: '', at: 0 }
    onToast(null)
    setMode(next)
  }

  const reveal = (b: number, i: number) => {
    if (mode === 'builder') {
      const step = shown.blocks.map((block) => block.steps.filter(written)).filter((steps) => steps.length)[b]?.[i]
      const el = step && root.current?.querySelector<HTMLInputElement>(`[data-step="${step.id}"] .b-label`)
      el?.focus({ preventScroll: true })
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    const line = parseDoc(source).blocks.filter((block) => block.steps.length)[b]?.steps[i]?.line
    const el = textarea.current
    if (line === undefined || !el) return
    const lines = source.split('\n')
    const start = lines.slice(0, line).join('\n').length + (line ? 1 : 0)
    el.focus({ preventScroll: true })
    el.setSelectionRange(start, start + lines[line].length)
    el.scrollTop = Math.max(0, line * parseFloat(getComputedStyle(el).lineHeight) - el.clientHeight / 3)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey
    const key = e.key.toLowerCase()
    if (e.key === 'Enter' && mod) {
      e.preventDefault()
      void (e.shiftKey && record ? saveAsNew() : save())
    } else if (mod && key === 'e' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      switchMode(mode === 'builder' ? 'text' : 'builder')
    } else if (mode === 'builder' && mod && (key === 'z' || key === 'y') && !e.altKey) {
      e.preventDefault()
      if (key === 'y' || e.shiftKey) redo()
      else undo()
    } else if (e.key === 'Escape' && source !== initial && !confirm('Discard your changes?')) {
      e.preventDefault()
    }
  }

  const modes: [Mode, string, string][] = [
    ['builder', 'Builder', 'Build it with fields'],
    ['text', 'Text', 'Write it as plain text'],
  ]

  return (
    <div className="editor" ref={root} tabIndex={-1} onKeyDown={onKeyDown}>
      <header className="sheet-head">
        <div className="editor-head">
          <h2>{record ? 'Edit routine' : 'New routine'}</h2>
          <div className="modes" role="group" aria-label="Editor">
            {modes.map(([value, label, hint]) => (
              <button key={value} data-on={mode === value || undefined} aria-pressed={mode === value} onClick={() => switchMode(value)} {...tip(hint, '⌘E')}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {mode === 'text' ? (
          <code className="syntax"># title · ## block ×2 · step 45s · ~ rest 15s · &gt; note</code>
        ) : (
          <p className="syntax">
            {library.length ? 'Pick an exercise you used before or type a new one' : 'Name each exercise and pick a duration'}
            <span className="keys-only"> · ⏎ next step · ⌥↑↓ move · ⌘Z undo</span>
          </p>
        )}
      </header>
      <div className="editor-grid">
        {mode === 'text' ? (
          <textarea
            ref={textarea}
            value={source}
            placeholder={TEMPLATE}
            onChange={(e) => write(e.target.value)}
            spellCheck={false}
            autoFocus
          />
        ) : (
          <Builder plan={shown} library={library} autoFocus={!record} onChange={build} />
        )}
        <div className="preview">
          <h3>
            <span>{routine.title}</span>
            <span className="num">{total === null ? 'open' : clock(total)}</span>
          </h3>
          {routine.blocks.map((block, b) => {
            const steps = routine.steps.filter((s) => s.block === b && s.round === 1)
            return (
              <section key={b}>
                <h4>
                  <span>
                    {block.name}
                    {steps[0].rounds > 1 && <em> ×{steps[0].rounds}</em>}
                  </span>
                  <span className="num">{block.seconds === null ? 'open' : clock(block.seconds)}</span>
                </h4>
                <ol>
                  {steps.map((s, i) => (
                    <li key={i} data-rest={s.rest || undefined} onClick={() => reveal(b, i)}>
                      <span>
                        {s.label}
                        {s.note && <small>{s.note}</small>}
                      </span>
                      <span className="num">{s.seconds === null ? 'open' : clock(s.seconds)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      </div>
      <footer className="sheet-foot">
        {record && (
          <button className="btn ghost danger" onClick={onDelete} {...tip('Delete this routine (you can undo)')}>
            Delete
          </button>
        )}
        {record && (
          <button
            className="btn secondary"
            onClick={saveAsNew}
            disabled={!canSave}
            {...tip(`Save as a new routine “${copyTitle}”. The original stays as it was`, '⌘⇧⏎')}
          >
            Save as new <kbd>⌘⇧⏎</kbd>
          </button>
        )}
        <button className="btn primary" onClick={save} disabled={!canSave} {...tip(record ? 'Save changes to this routine' : 'Save routine', '⌘⏎')}>
          Save <kbd>⌘⏎</kbd>
        </button>
      </footer>
    </div>
  )
}
