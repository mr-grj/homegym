import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import type { Session } from '../api'
import { clock, dayKey, human } from '../format'
import { parseYouTube, type Source } from '../music'
import { fold, quickRoutine, totalSeconds, type Routine } from '../routine'
import { Icon } from './Icon'
import { tip } from './Tooltips'

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
  const entry = useRef<HTMLDivElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })
  const text = query.trim()
  const quick = quickRoutine(text)
  const matches = routines.filter((r) => fold(r.title).includes(fold(text)))
  const routine = pick >= 0 ? matches[pick] : quick ? undefined : matches[0]
  const link = parseYouTube(text)
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

  const timers = recent.flatMap((t) => recentTimer(t) ?? []).slice(0, 4)
  const today = sessions.filter((s) => dayKey(s.started_at) === dayKey(new Date().toISOString()))
  const todaySeconds = today.reduce((sum, s) => sum + s.seconds, 0)

  const measure = () => {
    const el = list.current
    if (!el) return
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }))
  }

  useEffect(() => {
    const el = list.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(el.firstElementChild!)
    return () => observer.disconnect()
  }, [])

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
      <div className="entry" ref={entry}>
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
            const pasted = parseYouTube(e.clipboardData.getData('text'))
            if (!pasted) return
            e.preventDefault()
            onMusic(pasted)
          }}
        />
        <div className="entry-row" ref={row} style={text ? { minHeight: reserve.row } : undefined}>
          <button className="hint" data-invalid={(!target && !link) || undefined} onClick={submit} {...tip(target || link ? hint[0].toUpperCase() + hint.slice(1) : 'Type a duration like 25m', target || link ? '⏎' : undefined)}>
            {(target || link) && <kbd>⏎</kbd>}
            <span>{hint}</span>
          </button>
          {!text && timers.length > 0 && (
            <div className="recent-timers">
              <span className="entry-or">or</span>
              {timers.map((t) => (
                <button key={t.text} className="recent-timer" onClick={() => onQuick(t.routine, t.text)} {...tip(`Start ${t.label} again`)}>
                  <span className="chip-play">
                    <Icon name="play" />
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="routine-list"
        ref={list}
        style={text ? { minHeight: reserve.list } : undefined}
        data-reserved={(text && reserve.list > 0) || undefined}
        onScroll={measure}
        data-fade-top={fade.top || undefined}
        data-fade-bottom={fade.bottom || undefined}
      >
        <div className="chips routines">
          {matches.map((r) => {
            const total = totalSeconds(r.steps)
            return (
              <div key={r.id} className="chip" data-active={(target?.kind === 'routine' && target.routine === r) || undefined}>
                <button className="chip-main" onClick={() => onOpen(r)} {...tip(`Load “${r.title}”, then press Space to start`)}>
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
