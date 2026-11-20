import { useMemo, useState, type KeyboardEvent } from 'react'
import type { RoutineRecord } from '../api'
import { clock } from '../format'
import { parseRoutine, totalSeconds, uniqueTitle, withTitle } from '../routine'
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
  titles: string[]
  onSave: (source: string) => Promise<void>
  onSaveAsNew: (source: string) => Promise<void>
  onDelete: () => void
}

export function Editor({ record, titles, onSave, onSaveAsNew, onDelete }: Props) {
  const initial = record?.source ?? TEMPLATE
  const [source, setSource] = useState(initial)
  const [busy, setBusy] = useState(false)
  const routine = useMemo(() => parseRoutine(source), [source])
  const total = totalSeconds(routine.steps)

  const copyTitle = uniqueTitle(routine.title, titles)
  const canSave = !busy && routine.steps.length > 0

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

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void (e.shiftKey && record ? saveAsNew() : save())
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
