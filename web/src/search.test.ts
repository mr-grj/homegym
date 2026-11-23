import { describe, expect, test } from 'vitest'
import type { Session } from './api'
import { highlight, matches, monthGrid, parseQuery, sessionExercises, snippet } from './search'

const NOW = new Date(2026, 10, 23, 12)
const parse = (text: string, dayFirst = true) => parseQuery(text, NOW, dayFirst)
const range = (text: string, dayFirst = true) => parse(text, dayFirst).range
const one = (k: string) => ({ from: k, to: k })

const session = (over: Partial<Session> = {}): Session => ({
  id: 1,
  title: 'Antrenament full-body (20 min)',
  started_at: new Date(2026, 10, 20, 7, 30).toISOString(),
  ended_at: new Date(2026, 10, 20, 7, 50).toISOString(),
  seconds: 1200,
  effort: 7,
  notes: 'Genuflexiunile au mers bine',
  blocks: [
    { name: 'Încălzire', done: true, exercises: ['Aplecări din șold, spatele drept', 'Goblet squat'] },
    { name: 'Blocul D', done: false, exercises: ['Dead bug'] },
  ],
  ...over,
})

describe('parseQuery', () => {
  test('plain words are terms, folded and trimmed of commas', () => {
    expect(parse('  Goblet  Squat, ')).toEqual({ range: null, terms: ['goblet', 'squat'], rest: 'Goblet Squat,' })
    expect(parse('')).toEqual({ range: null, terms: [], rest: '' })
  })

  test('relative days in English and Romanian', () => {
    expect(range('today')).toEqual(one('2026-11-23'))
    expect(range('Azi')).toEqual(one('2026-11-23'))
    expect(range('yesterday')).toEqual(one('2026-11-22'))
    expect(range('ieri')).toEqual(one('2026-11-22'))
  })

  test('month and day in either order, with ordinals, commas and years', () => {
    for (const text of ['nov 20', '20 nov', 'November 20th', '20 noiembrie', 'Nov 20,', '20.11', '2026-11-20', '20.11.2026'])
      expect(range(text), text).toEqual(one('2026-11-20'))
    expect(range('nov 20 2025')).toEqual(one('2025-11-20'))
    expect(range('20 nov 2025')).toEqual(one('2025-11-20'))
  })

  test('a date without a year is the latest one not in the future', () => {
    expect(range('dec 25')).toEqual(one('2025-12-25'))
    expect(range('nov 24')).toEqual(one('2025-11-24'))
    expect(range('nov 23')).toEqual(one('2026-11-23'))
    expect(range('29 feb')).toBeNull()
    expect(range('29 feb 2028')).toEqual(one('2028-02-29'))
  })

  test('slashes follow the locale unless only one order is possible', () => {
    expect(range('11/20')).toEqual(one('2026-11-20'))
    expect(range('20/11')).toEqual(one('2026-11-20'))
    expect(range('3/4', true)).toEqual(one('2026-04-03'))
    expect(range('3/4', false)).toEqual(one('2026-03-04'))
  })

  test('a month on its own or with a year covers the whole month', () => {
    expect(range('nov')).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(range('december')).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(range('feb 2028')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(range('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  test('dates mix with words, and look-alikes stay words', () => {
    expect(parse('core nov 20')).toEqual({ range: one('2026-11-20'), terms: ['core'], rest: 'core' })
    expect(parse('20 nov squats')).toEqual({ range: one('2026-11-20'), terms: ['squats'], rest: 'squats' })
    expect(parse('20 min')).toEqual({ range: null, terms: ['20', 'min'], rest: '20 min' })
    expect(parse('mai greu')).toEqual({ range: null, terms: ['mai', 'greu'], rest: 'mai greu' })
    expect(parse('31 feb').range).toBeNull()
    expect(parse('32.1').range).toBeNull()
    expect(parse('2026-13').range).toBeNull()
  })
})

describe('matches', () => {
  test('every term must appear in the title, a done exercise or the notes', () => {
    const s = session()
    expect(matches(s, parse('full body'))).toBe(true)
    expect(matches(s, parse('sold goblet'))).toBe(true)
    expect(matches(s, parse('GENUFLEXIUNILE'))).toBe(true)
    expect(matches(s, parse('goblet burpee'))).toBe(false)
    expect(matches(s, parse('dead bug'))).toBe(false)
    expect(matches(s, parse('incalzire'))).toBe(false)
  })

  test('date ranges are whole local days', () => {
    expect(matches(session(), parse('nov 20'))).toBe(true)
    expect(matches(session(), parse('nov 21'))).toBe(false)
    expect(matches(session(), parse('nov'))).toBe(true)
    expect(matches(session(), parse('squat 20.11'))).toBe(true)
    expect(matches(session(), parse('squat 21.11'))).toBe(false)
    const late = session({ started_at: new Date(2026, 10, 20, 23, 59).toISOString() })
    expect(matches(late, parse('nov 20'))).toBe(true)
  })

  test('sessions saved before exercises were stored still match by title and notes', () => {
    const old = session({ blocks: [{ name: 'Circuit', done: true }] })
    expect(sessionExercises(old)).toEqual([])
    expect(matches(old, parse('antrenament'))).toBe(true)
  })
})

describe('highlight', () => {
  test('marks matches in the original text, diacritics included', () => {
    expect(highlight('Aplecări din șold', ['sold', 'apleca'])).toEqual([
      { text: 'Aplecă', hit: true },
      { text: 'ri din ', hit: false },
      { text: 'șold', hit: true },
    ])
    expect(highlight('Squat squat', ['squat']).filter((p) => p.hit)).toHaveLength(2)
    expect(highlight('Plank', [])).toEqual([{ text: 'Plank', hit: false }])
    expect(highlight('Plank', ['xyz'])).toEqual([{ text: 'Plank', hit: false }])
  })

  test('overlapping terms merge into one mark', () => {
    expect(highlight('kettlebell', ['kettle', 'bell'])).toEqual([{ text: 'kettlebell', hit: true }])
  })
})

describe('snippet', () => {
  const note = 'Felt strong today and the warm-up went fine, then the main circuit was hard but I kept going until the kettlebell swings at the end.'
  test('starts a long note near the first match', () => {
    const cut = snippet(note, ['swings'])
    expect(cut.startsWith('…')).toBe(true)
    expect(cut).toContain('kettlebell swings')
    expect(cut.length).toBeLessThan(note.length)
  })

  test('leaves the note alone when the match is near the start or missing', () => {
    expect(snippet(note, ['strong'])).toBe(note)
    expect(snippet(note, ['nothing'])).toBe(note)
    expect(snippet(note, [])).toBe(note)
  })
})

describe('monthGrid', () => {
  test('pads weeks for the first day of the week', () => {
    const monday = monthGrid(2026, 10, 1)
    expect(monday[0]).toEqual([null, null, null, null, null, null, 1])
    expect(monday.at(-1)).toEqual([30, null, null, null, null, null, null])
    const sunday = monthGrid(2026, 10, 7)
    expect(sunday[0]).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(sunday.flat().filter(Boolean)).toHaveLength(30)
  })
})
