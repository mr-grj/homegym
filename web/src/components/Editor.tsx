import { useMemo, useState, type KeyboardEvent } from 'react'
import type { RoutineRecord } from '../api'
import { clock } from '../format'
import { parseRoutine, totalSeconds } from '../routine'
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

type Props = {
  record: RoutineRecord | null
  onSave: (source: string) => Promise<void>
  onDelete: () => void
}

export function Editor({ record, onSave, onDelete }: Props) {
  const initial = record?.source ?? TEMPLATE
  const [source, setSource] = useState(initial)
  const [busy, setBusy] = useState(false)
  const routine = useMemo(() => parseRoutine(source), [source])
  const total = totalSeconds(routine.steps)

  const save = async () => {
    if (busy || !routine.steps.length) return
    setBusy(true)
    await onSave(source).finally(() => setBusy(false))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void save()
    } else if (e.key === 'Escape' && source !== initial && !confirm('Discard your changes?')) {
      e.preventDefault()
    }
  }

  return (
    <div className="editor" onKeyDown={onKeyDown}>
      <header className="sheet-head">
        <h2>{record ? 'Edit routine' : 'New routine'}</h2>
        <code className="syntax"># title · ## block ×2 · step 45s · ~ rest 15s · &gt; note</code>
      </header>
      <div className="editor-grid">
        <textarea value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} autoFocus />
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
                    <li key={i} data-rest={s.rest || undefined}>
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
        <button className="btn primary" onClick={save} disabled={busy || !routine.steps.length} {...tip('Save routine', '⌘⏎')}>
          Save <kbd>⌘⏎</kbd>
        </button>
      </footer>
    </div>
  )
}
