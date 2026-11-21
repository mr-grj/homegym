import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import type { Session } from '../api'
import { clock, dayKey, human } from '../format'
import { parseMusic, type Source } from '../music'
import { fold, quickRoutine, totalSeconds, uniqueTimers, type Routine } from '../routine'
import { Icon } from './Icon'
import { tip } from './Tooltips'
import { useScrollFade } from './useScrollFade'

type Props = {
  routines: Routine[]
  recent: string[]
  sessions: Session[]
  inputRef: RefObject<HTMLInputElement | null>
  onQuick: (routine: Routine, text: string) => void
  onOpen: (routine: Routine) => void
  onEdit: (id: number | null) => void
  onMusic: (source: Source) => void
}

const recentTimer = (text: string) => {
  const routine = quickRoutine(text)
  const seconds = routine?.steps[0].seconds
  if (!routine || !seconds) return null
  return { text, routine, label: routine.title === 'Timer' ? clock(seconds) : `${clock(seconds)} ${routine.title}` }
}

function Peek({ routine }: { routine: Routine }) {
  const blocks = routine.blocks.map((block, b) => ({ ...block, steps: routine.steps.filter((step) => step.block === b) }))
  const rows = blocks.flatMap((block) => [
    { name: block.name, rounds: block.steps[0].rounds, seconds: block.seconds, step: false },
    ...(blocks.length === 1 ? block.steps.filter((step) => step.round === 1).map((step) => ({ name: step.label, rounds: 1, seconds: step.seconds, step: true })) : []),
  ])
  const shown = rows.length > 8 ? rows.slice(0, 7) : rows
  return (
    <div className="peek">
      <div className="peek-strip">
        {blocks.map((block, b) => (
          <span key={b} style={{ flex: `${block.steps.reduce((sum, step) => sum + (step.seconds ?? 30), 0)} 1 0` }}>
            {block.steps.map((step, i) => (
              <i key={i} data-rest={step.rest || undefined} style={{ flex: `${step.seconds ?? 30} 1 0` }} />
            ))}
          </span>
        ))}
      </div>
      <ul>
        {shown.map((row, i) => (
          <li key={i} data-step={row.step || undefined}>
            <span>
              {row.name}
              {row.rounds > 1 && <em> ×{row.rounds}</em>}
            </span>
            {row.seconds !== null && <span className="num">{clock(row.seconds)}</span>}
          </li>
        ))}
        {shown.length < rows.length && <li data-step>+{rows.length - shown.length} more</li>}
      </ul>
      <p>Click to load, then Space to start</p>
    </div>
  )
}

const shake = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-10px)' },
  { transform: 'translateX(10px)' },
  { transform: 'translateX(0)' },
]

export function Launcher({ routines, recent, sessions, inputRef, onQuick, onOpen, onEdit, onMusic }: Props) {
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState(-1)
  const [reserve, setReserve] = useState({ row: 0, list: 0 })
  const entry = useRef<HTMLFormElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const scroll = useScrollFade<HTMLDivElement>()
  const list = scroll.ref
  const text = query.trim()
  const quick = quickRoutine(text)
  const matches = routines.filter((r) => fold(r.title).includes(fold(text)))
  const routine = pick >= 0 ? matches[pick] : quick ? undefined : matches[0]
  const link = parseMusic(text)
  const target = routine ? { kind: 'routine' as const, routine } : quick && { kind: 'quick' as const, routine: quick }
  const seconds = target?.routine.steps[0].seconds

  const hint = link
    ? 'load this music'
    : !target
    ? 'No match. Try 25m, 1:30 or 90s'
    : target.kind === 'routine'
      ? `open ${target.routine.title}`
      : seconds
        ? `start ${clock(seconds)} countdown${target.routine.title === 'Timer' ? '' : ` · ${target.routine.title}`}`
        : 'start stopwatch'

  const timers = uniqueTimers(recent).flatMap((t) => recentTimer(t) ?? []).slice(0, 3)
  const today = sessions.filter((s) => dayKey(s.started_at) === dayKey(new Date().toISOString()))
  const todaySeconds = today.reduce((sum, s) => sum + s.seconds, 0)

  useEffect(() => {
    list.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [pick, text])

  const submit = () => {
    if (link) {
      setQuery('')
      return onMusic(link)
    }
    if (!target) return void entry.current?.animate(shake, { duration: 260, easing: 'ease-out' })
    if (target.kind === 'quick') onQuick(target.routine, text)
    else onOpen(target.routine)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
    else if (e.key === 'ArrowDown') setPick((p) => Math.min(matches.length - 1, p + 1))
    else if (e.key === 'ArrowUp') setPick((p) => Math.max(-1, p - 1))
    else if (e.key === 'Escape' && query) setQuery('')
    else if (e.key === 'Escape') return e.currentTarget.blur()
    else return
    e.preventDefault()
  }

  return (
    <main className="launcher">
      <form className="entry" ref={entry} onSubmit={(e) => (e.preventDefault(), submit())}>
        <input
          ref={inputRef}
          className="entry-input"
          value={query}
          placeholder="0:00"
          spellCheck={false}
          autoComplete="off"
          autoFocus={matchMedia('(pointer: fine)').matches}
          aria-label="Duration or routine"
          style={{ fontSize: `calc(var(--huge) * ${Math.min(1, 5 / Math.max(5, query.length))})` }}
          onChange={(e) => {
            if (!query) setReserve({ row: row.current?.offsetHeight ?? 0, list: list.current?.offsetHeight ?? 0 })
            setQuery(e.target.value)
            setPick(-1)
          }}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            const pasted = parseMusic(e.clipboardData.getData('text'))
            if (!pasted) return
            e.preventDefault()
            onMusic(pasted)
          }}
        />
        <div className="entry-row" ref={row} style={text ? { minHeight: reserve.row } : undefined}>
          <button className="hint" data-invalid={(!target && !link) || undefined} {...tip(target || link ? hint[0].toUpperCase() + hint.slice(1) : 'Type a duration like 25m', target || link ? '⏎' : undefined)}>
            {(target || link) && <kbd>⏎</kbd>}
            <span>{hint}</span>
          </button>
          {!text && timers.length > 0 && (
            <div className="recent-timers">
              <span className="entry-or">or</span>
              {timers.map((t) => (
                <button key={t.text} type="button" className="recent-timer" onClick={() => onQuick(t.routine, t.text)} {...tip(`Start ${t.label} again`)}>
                  <span className="chip-play">
                    <Icon name="play" />
                  </span>
                  <span className="recent-label">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      <div
        className="routine-list"
        {...scroll}
        style={text ? { minHeight: reserve.list } : undefined}
        data-reserved={(text && reserve.list > 0) || undefined}
      >
        <div className="chips routines">
          {matches.map((r) => {
            const total = totalSeconds(r.steps)
            return (
              <div key={r.id} className="chip" data-active={(target?.kind === 'routine' && target.routine === r) || undefined}>
                <button className="chip-main" onClick={() => onOpen(r)} {...tip(`Load “${r.title}”, then press Space to start`, undefined, <Peek routine={r} />)}>
                  <span className="chip-play">
                    <Icon name="play" />
                  </span>
                  <b>{r.title}</b>
                  {total !== null && <span className="chip-time">{clock(total)}</span>}
                </button>
                <button className="chip-edit" onClick={() => onEdit(r.id)} {...tip(`Edit “${r.title}”`)}>
                  <Icon name="edit" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="chips actions">
        <button className="chip ghost" onClick={() => onEdit(null)} {...tip('Create a routine')}>
          <Icon name="plus" /> Routine
        </button>
      </div>

      <p className="today">
        {today.length ? `Today · ${today.length} logged · ${human(todaySeconds)}` : 'Nothing logged today yet'}
      </p>
    </main>
  )
}
