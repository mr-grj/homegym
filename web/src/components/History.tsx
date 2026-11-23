import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Session } from '../api'
import { dayKey, dayLabel, human } from '../format'
import { highlight, matches, monthRange, parseQuery, sessionExercises, snippet, type DayRange } from '../search'
import { Calendar, monthLabel } from './Calendar'
import { Icon } from './Icon'
import { tip } from './Tooltips'
import { useScrollFade } from './useScrollFade'

const clockTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

function rangeLabel(range: DayRange, short = false) {
  const [y, m, d] = range.from.split('-').map(Number)
  if (range.from !== range.to) return short ? new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : monthLabel(y, m - 1)
  const label = dayLabel(range.from)
  return short && !/^(Today|Yesterday)$/.test(label) ? new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : label
}

function Marked({ text, terms }: { text: string; terms: string[] }) {
  return highlight(text, terms).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : part.text))
}

function Entry({ session, terms, onDelete }: { session: Session; terms: string[]; onDelete: (session: Session) => void }) {
  const text = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [clipped, setClipped] = useState(false)
  const done = session.blocks.filter((b) => b.done)
  const exercises = sessionExercises(session)
  const hits = terms.length ? exercises.filter((name) => highlight(name, terms).some((p) => p.hit)) : []
  const shownExercises = open || !hits.length ? exercises : hits
  const note = open ? session.notes : snippet(session.notes, terms)
  const reduced = shownExercises.length < exercises.length || note !== session.notes
  const time = clockTime(session.started_at)
  const meta = [session.effort && `effort ${session.effort}/10`, session.blocks.length > 0 && `${done.length}/${session.blocks.length} blocks`]
    .filter(Boolean)
    .join(' · ')
  const expandable = clipped || open || reduced

  useLayoutEffect(() => {
    const el = text.current
    if (!el || open) return
    const measure = () =>
      setClipped([...el.querySelectorAll('[data-clip]')].some((c) => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, expandable, terms.join(' ')])

  const body = (
    <span className="log-text" ref={text}>
      <b className="log-title" data-clip>
        <Marked text={session.title} terms={terms} />
      </b>
      {shownExercises.length > 0 && (
        <span className="log-did" data-clip>
          <Marked text={shownExercises.join(' · ')} terms={terms} />
          {shownExercises.length < exercises.length && <span className="log-more"> +{exercises.length - shownExercises.length}</span>}
        </span>
      )}
      <small className="log-meta" data-empty={!meta || undefined}>
        <span className="log-when">
          {time}
          {meta && ' · '}
        </span>
        {meta}
      </small>
      {note && (
        <span className="log-note" data-clip>
          <Marked text={note} terms={terms} />
        </span>
      )}
    </span>
  )

  return (
    <li className="log" data-open={open || undefined}>
      <span className="when num">{time}</span>
      {expandable ? (
        <button className="log-body" aria-expanded={open} onClick={() => setOpen(!open)} {...tip(open ? 'Show less' : `Show all of “${session.title}”`)}>
          {body}
        </button>
      ) : (
        <div className="log-body">{body}</div>
      )}
      <span className="log-time num">{human(session.seconds)}</span>
      <button className="icon-btn" onClick={() => onDelete(session)} {...tip(`Delete “${session.title}” (you can undo)`)}>
        <Icon name="close" />
      </button>
    </li>
  )
}

const finePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches

export function History({ sessions, onDelete }: { sessions: Session[]; onDelete: (session: Session) => void }) {
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<DayRange | null>(null)
  const [calendar, setCalendar] = useState(false)
  const [shown, setShown] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const query = parseQuery(text)
  const range = picked ?? query.range
  const terms = query.terms
  const filtering = !!range || terms.length > 0
  const found = sessions.filter((s) => matches(s, { range, terms }))
  const days = Map.groupBy(found, (s) => dayKey(s.started_at))
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions) map.set(dayKey(s.started_at), (map.get(dayKey(s.started_at)) ?? 0) + 1)
    return map
  }, [sessions])
  const earliest = useMemo(() => [...counts.keys()].sort()[0] ?? dayKey(new Date().toISOString()), [counts])
  const key = `${text}|${picked?.from}|${picked?.to}|${found.length}`
  const scroll = useScrollFade<HTMLDivElement>(key)

  useLayoutEffect(() => {
    const sheet = root.current?.parentElement
    if (sheet) sheet.style.setProperty('--sheet-h', `${sheet.offsetHeight}px`)
  }, [])

  useEffect(() => {
    if (!range) return
    const [y, m] = range.from.split('-').map(Number)
    setShown({ y, m: m - 1 })
  }, [range?.from])

  useEffect(() => {
    scroll.ref.current?.scrollTo({ top: 0 })
  }, [text, picked])

  const pick = (next: DayRange) => {
    const same = picked?.from === next.from && picked.to === next.to
    setPicked(same ? null : next)
    setText(query.range ? query.rest : text)
    setCalendar(false)
  }

  const clear = () => {
    setText('')
    setPicked(null)
    input.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && (text || picked)) {
      e.preventDefault()
      clear()
    } else if (e.key === 'Backspace' && !text && picked) {
      e.preventDefault()
      setPicked(null)
    }
  }

  const total = found.reduce((sum, s) => sum + s.seconds, 0)
  const missing = [terms.length ? `Nothing matches “${query.rest}”` : 'Nothing logged', range && `on ${rangeLabel(range)}`].filter(Boolean).join(' ')

  return (
    <div className="history" ref={root}>
      <header className="sheet-head">
        <h2>History</h2>
      </header>
      {sessions.length === 0 ? (
        <p className="empty">Nothing logged yet. Finish a timer and it lands here.</p>
      ) : (
        <div className="history-body" data-calendar={calendar || undefined}>
          <div className="picker-entry history-search">
            <Icon name="search" />
            {picked && (
              <button className="day-chip" onClick={() => setPicked(null)} {...tip(`Show every day, not just ${rangeLabel(picked)}`)}>
                <span>{rangeLabel(picked, true)}</span>
                <Icon name="close" />
              </button>
            )}
            <input
              ref={input}
              autoFocus={finePointer()}
              value={text}
              placeholder={picked ? 'Search' : 'Search exercises or dates'}
              aria-label="Search history by routine, exercise, note or date"
              spellCheck={false}
              onChange={(e) => {
                setText(e.target.value)
                if (parseQuery(e.target.value).range) setPicked(null)
              }}
              onKeyDown={onKeyDown}
            />
            {text && (
              <button className="icon-btn" onClick={clear} {...tip('Clear the search', 'Esc')}>
                <Icon name="close" />
              </button>
            )}
            <button
              className="icon-btn cal-toggle"
              data-on={calendar || undefined}
              aria-expanded={calendar}
              onClick={() => setCalendar(!calendar)}
              {...tip(calendar ? 'Hide the calendar' : 'Pick a day')}
            >
              <Icon name="calendar" />
            </button>
          </div>
          <Calendar
            counts={counts}
            shown={shown}
            earliest={earliest}
            range={range}
            onShow={(y, m) => setShown({ y, m })}
            onDay={(k) => pick({ from: k, to: k })}
            onMonth={(y, m) => pick(monthRange(y, m))}
          />
          {filtering && found.length > 0 && (
            <p className="history-count" aria-live="polite">
              {[!picked && range && rangeLabel(range), `${found.length} logged`, human(total)].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="history-list" {...scroll}>
            <div>
              {found.length === 0 && <p className="empty">{missing}.</p>}
              {[...days].map(([day, items]) => (
                <section key={day} className="day">
                  <h3>
                    <span>{dayLabel(day)}</span>
                    <span className="num">{human(items.reduce((sum, s) => sum + s.seconds, 0))}</span>
                  </h3>
                  <ul>
                    {items.map((s) => (
                      <Entry key={s.id} session={s} terms={terms} onDelete={onDelete} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
