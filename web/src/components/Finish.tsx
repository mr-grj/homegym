import { useEffect, useEffectEvent, useState, type CSSProperties } from 'react'
import type { SessionBlock } from '../api'
import { clock } from '../format'
import type { Run } from '../timer'
import { Icon } from './Icon'
import { tip } from './Tooltips'

export type FinishForm = { effort: number; notes: string; blocks: SessionBlock[] }

type Props = {
  run: Run
  onSave: (form: FinishForm) => Promise<void>
  onDiscard: () => void
}

export function Finish({ run, onSave, onDiscard }: Props) {
  const [blocks, setBlocks] = useState(() =>
    run.routine.blocks.map((block, b) => ({
      name: block.name,
      done: !!run.finishedAt || run.steps.findLastIndex((s) => s.block === b) < run.index,
    })),
  )
  const [effort, setEffort] = useState(7)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const done = blocks.filter((b) => b.done).length

  const save = async () => {
    if (busy) return
    setBusy(true)
    await onSave({ effort, notes: notes.trim(), blocks }).finally(() => setBusy(false))
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.target instanceof HTMLButtonElement) return
    const inText = e.target instanceof HTMLTextAreaElement
    if (e.key === 'Enter' && (!inText || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void save()
    } else if (!inText && /^\d$/.test(e.key)) {
      e.preventDefault()
      setEffort(Number(e.key) || 10)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="finish">
      <header className="sheet-head">
        <p className="eyebrow">{run.finishedAt ? 'Complete' : 'Stopped early'}</p>
        <h2>{run.routine.title}</h2>
        <p className="big num">{clock(Math.round(run.total / 1000))}</p>
      </header>

      <ul className="checklist">
        {blocks.map((block, i) => (
          <li key={i}>
            <button
              data-done={block.done || undefined}
              {...tip(`Mark ${block.name} as ${block.done ? 'not done' : 'done'}`)}
              onClick={() => setBlocks((all) => all.with(i, { ...block, done: !block.done }))}
            >
              <span className="box">
                <Icon name="check" />
              </span>
              <span className="grow">{block.name}</span>
              {run.routine.blocks[i].seconds !== null && <span className="num">{clock(run.routine.blocks[i].seconds!)}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="count">
        {done}/{blocks.length} completed
      </p>

      <div className="field">
        <label>
          How hard was it? <b className="num">{effort}/10</b>
        </label>
        <div className="effort">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              data-on={n <= effort || undefined}
              style={{ '--i': n } as CSSProperties}
              onClick={() => setEffort(n)}
              {...tip(`Effort ${n} of 10`, String(n % 10))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <textarea className="notes" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

      <footer className="sheet-foot">
        <button className="btn ghost" onClick={onDiscard} {...tip('Throw this workout away without saving')}>
          Discard
        </button>
        <button className="btn primary" onClick={save} disabled={busy} {...tip('Save the workout to history', '⏎')}>
          Finish workout <kbd>⏎</kbd>
        </button>
      </footer>
    </div>
  )
}
