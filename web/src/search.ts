import type { Session } from './api'
import { dayKey } from './format'
import { fold } from './routine'

/** Inclusive range of local day keys (YYYY-MM-DD). */
export type DayRange = { from: string; to: string }

/** A history search: an optional date range plus words that must all appear. */
export type Query = { range: DayRange | null; terms: string[]; rest: string }

const MONTHS: Record<string, number> = {}
const names = [
  ['january', 'jan', 'ianuarie', 'ian'],
  ['february', 'feb', 'februarie'],
  ['march', 'mar', 'martie'],
  ['april', 'apr', 'aprilie'],
  ['may', 'mai'],
  ['june', 'jun', 'iunie', 'iun'],
  ['july', 'jul', 'iulie', 'iul'],
  ['august', 'aug'],
  ['september', 'sep', 'sept', 'septembrie'],
  ['october', 'oct', 'octombrie'],
  ['november', 'nov', 'noiembrie', 'noi'],
  ['december', 'dec', 'decembrie'],
]
names.forEach((list, month) => list.forEach((name) => (MONTHS[name] = month)))

const TODAY = new Set(['today', 'azi', 'astazi'])
const YESTERDAY = new Set(['yesterday', 'ieri'])

const pad = (n: number) => String(n).padStart(2, '0')
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

/** The range covering one whole month (`m` is 0-based). */
export const monthRange = (y: number, m: number): DayRange => ({ from: key(y, m, 1), to: key(y, m, daysIn(y, m)) })

function day(y: number | null, m: number, d: number, now: Date): DayRange | null {
  if (m < 0 || m > 11 || d < 1) return null
  let year = y ?? now.getFullYear()
  if (y === null && key(year, m, Math.min(d, daysIn(year, m))) > dayKey(now.toISOString())) year--
  if (d > daysIn(year, m)) return null
  const k = key(year, m, d)
  return { from: k, to: k }
}

function month(y: number | null, m: number, now: Date): DayRange {
  const year = y ?? (m > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear())
  return monthRange(year, m)
}

const dayNumber = (token: string) => (/^\d{1,2}(?:st|nd|rd|th)?$/.test(token) ? parseInt(token, 10) : null)
const yearNumber = (token: string | undefined) => (token && /^\d{4}$/.test(token) ? Number(token) : null)

/** Whether dates written with slashes put the day first in this locale. */
export function dayFirst(locale?: string) {
  const parts = new Intl.DateTimeFormat(locale).formatToParts(new Date(2026, 10, 20)).map((p) => p.type)
  return parts.indexOf('day') < parts.indexOf('month')
}

function numeric(token: string, now: Date, slashDayFirst: boolean): DayRange | null {
  const iso = token.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/)
  if (iso) return iso[3] ? day(+iso[1], +iso[2] - 1, +iso[3], now) : +iso[2] >= 1 && +iso[2] <= 12 ? monthRange(+iso[1], +iso[2] - 1) : null
  const dotted = token.match(/^(\d{1,2})([./])(\d{1,2})(?:\2(\d{4}))?$/)
  if (!dotted) return null
  const [a, b] = [+dotted[1], +dotted[3]]
  const first = dotted[2] === '.' || a > 12 ? true : b > 12 ? false : slashDayFirst
  const year = dotted[4] ? +dotted[4] : null
  return first ? day(year, b - 1, a, now) : day(year, a - 1, b, now)
}

/** Split a history search into a date range (today, nov 20, 20 nov 2025, 20.11, 2026-11-20, a lone month) and words. */
export function parseQuery(text: string, now = new Date(), slashDayFirst = dayFirst()): Query {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const tokens = words.map((w) => fold(w).replace(/^[,.]+|[,.]+$/g, ''))
  const dateish = (t: string) => /^[\d./-]+$/.test(t) && /\d[./-]\d/.test(t)
  const find = (): { range: DayRange; at: number; length: number } | null => {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      const today = new Date(now)
      if (TODAY.has(t)) return { range: day(today.getFullYear(), today.getMonth(), today.getDate(), now)!, at: i, length: 1 }
      if (YESTERDAY.has(t)) {
        today.setDate(today.getDate() - 1)
        return { range: day(today.getFullYear(), today.getMonth(), today.getDate(), now)!, at: i, length: 1 }
      }
      if (dateish(t)) {
        const range = numeric(t, now, slashDayFirst)
        if (range) return { range, at: i, length: 1 }
      }
      const m = MONTHS[t]
      if (m === undefined) continue
      const after = dayNumber(tokens[i + 1] ?? '')
      const before = i > 0 ? dayNumber(tokens[i - 1]) : null
      if (after !== null) {
        const year = yearNumber(tokens[i + 2])
        const range = day(year, m, after, now)
        if (range) return { range, at: i, length: year ? 3 : 2 }
      }
      if (before !== null) {
        const year = yearNumber(tokens[i + 1])
        const range = day(year, m, before, now)
        if (range) return { range, at: i - 1, length: year ? 3 : 2 }
      }
      const year = yearNumber(tokens[i + 1])
      if (year) return { range: month(year, m, now), at: i, length: 2 }
      if (tokens.length === 1) return { range: month(null, m, now), at: i, length: 1 }
    }
    return null
  }
  const found = find()
  const cut = <T,>(list: T[]) => (found ? list.toSpliced(found.at, found.length) : list)
  return { range: found?.range ?? null, terms: cut(tokens).filter(Boolean), rest: cut(words).join(' ') }
}

/** The exercises a session shows: those of the blocks marked done, each once. */
export const sessionExercises = (s: Session) => [...new Set(s.blocks.filter((b) => b.done).flatMap((b) => b.exercises ?? []))]

/** True when the session falls in the range and every term appears in its title, exercises or notes. */
export function matches(s: Session, query: Pick<Query, 'range' | 'terms'>) {
  const day = dayKey(s.started_at)
  if (query.range && (day < query.range.from || day > query.range.to)) return false
  const haystack = [s.title, ...sessionExercises(s), s.notes].map(fold)
  return query.terms.every((term) => haystack.some((text) => text.includes(term)))
}

/** Split text into plain and matching parts, ignoring case and diacritics. */
export function highlight(text: string, terms: string[]): { text: string; hit: boolean }[] {
  const used = terms.filter(Boolean)
  if (!used.length) return [{ text, hit: false }]
  const chars = [...text]
  let folded = ''
  const origin: number[] = []
  chars.forEach((ch, i) => {
    for (const f of fold(ch)) {
      folded += f
      origin.push(i)
    }
  })
  const marked = new Array<boolean>(chars.length).fill(false)
  for (const term of used)
    for (let at = folded.indexOf(term); at >= 0; at = folded.indexOf(term, at + 1))
      for (let j = at; j < at + term.length; j++) marked[origin[j]] = true
  const parts: { text: string; hit: boolean }[] = []
  chars.forEach((ch, i) => {
    const last = parts.at(-1)
    if (last && last.hit === marked[i]) last.text += ch
    else parts.push({ text: ch, hit: marked[i] })
  })
  return parts
}

/** Start a long note near its first match so the match shows in a short preview. */
export function snippet(text: string, terms: string[], lead = 60): string {
  const folded = fold(text)
  const at = Math.min(...terms.filter(Boolean).map((t) => folded.indexOf(t)).filter((i) => i >= 0))
  if (!Number.isFinite(at) || at <= lead) return text
  const space = text.lastIndexOf(' ', at - 20)
  return `…${text.slice(space < 0 ? at : space + 1)}`
}

/** Weeks of a month as day numbers, with null for the padding before the first and after the last day. */
export function monthGrid(y: number, m: number, firstDay = 1): (number | null)[][] {
  const lead = (new Date(y, m, 1).getDay() - (firstDay % 7) + 7) % 7
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: daysIn(y, m) }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
}
