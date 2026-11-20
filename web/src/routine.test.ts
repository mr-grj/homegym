import { describe, expect, test } from 'vitest'
import seed from '../../api/app/seed.txt?raw'
import {
  durationText,
  fold,
  parseDoc,
  parseRoutine,
  quickRoutine,
  readDuration,
  serializeDoc,
  splitDuration,
  stepLibrary,
  totalSeconds,
  uniqueTimers,
  uniqueTitle,
  withTitle,
  type Doc,
} from './routine'

const examples = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true })

const withoutLang = (source: string) => ({ ...parseRoutine(source), lang: undefined })

function roundTrip(source: string) {
  const written = serializeDoc(parseDoc(source))
  expect(withoutLang(written)).toEqual(withoutLang(source))
  expect(serializeDoc(parseDoc(written))).toBe(written)
  return written
}

describe('round trip', () => {
  test.each(Object.entries(examples))('%s is written back unchanged', (_, source) => {
    expect(roundTrip(source).trim()).toBe(source.trim())
  })

  test('seed routine', () => {
    expect(roundTrip(seed).trim()).toBe(seed.trim())
  })

  test.each([
    ['bare steps before a block', 'Plank 1m\n~ rest 10s\nSquat 1m\n## Block ×2\nA 30s'],
    ['rest first', '~ Breathe 30s\nPlank 1m'],
    ['empty headers', '## \nA 30s\n## ×3\nB 20s'],
    ['repeat-like name', '## Circuit x2 ×1\nA 30s'],
    ['no title', '## A\nx 1m'],
    ['title only', '# Hi'],
    ['open steps', '## Stretch\nQuads\n~ Rest'],
    ['stacked notes', '## A\nX 30s\n> one\n> two'],
    ['labels that look like syntax', '## A\nRun 5m · 45s\nWalk 5m ·\n· 1:30 hold\n· #1 squat 30s\n· > quote 10s'],
    ['clock durations', '## A\nLong 1:01:00\nHour 1h\nX 90s\nY 1m30s'],
    ['orphan notes', '> lost\n# T\n## A\n> lost too\nX 5s'],
  ])('%s', (_, source) => {
    roundTrip(source)
  })

  test('builder structures with awkward labels survive', () => {
    const step = (label: string, seconds: number | null, rest = false) => ({ label, seconds, rest, note: '', line: 0 })
    const doc: Doc = {
      title: '  My  routine ',
      blocks: [
        {
          name: 'Circuit x3',
          rounds: 1,
          implicit: false,
          steps: [
            step('Run 5m', 45),
            step('Run 5m', null),
            step('1:30 hold', null),
            step('#1 squat', 30),
            step('> quote', 10),
            step('~tilde', null),
            step('', 45),
            step('', null, true),
            step('', null),
            step('Plank ·', 5),
            { ...step('a  b ', 5), note: '  n  ' },
          ],
        },
        { name: '', rounds: 4, implicit: false, steps: [] },
        { name: 'Plank', rounds: 1, implicit: true, steps: [step('Plank', 60)] },
      ],
    }
    const back = parseDoc(serializeDoc(doc))
    expect(back.title).toBe('My routine')
    expect(back.blocks.map((b) => [b.name, b.rounds, b.steps.map((s) => [s.label, s.seconds, s.rest, s.note])])).toEqual([
      [
        'Circuit x3',
        1,
        [
          ['Run 5m', 45, false, ''],
          ['Run 5m', null, false, ''],
          ['1:30 hold', null, false, ''],
          ['#1 squat', 30, false, ''],
          ['> quote', 10, false, ''],
          ['~tilde', null, false, ''],
          ['', 45, false, ''],
          ['', null, true, ''],
          ['Plank ·', 5, false, ''],
          ['a b', 5, false, 'n'],
        ],
      ],
      ['Plank', 1, [['Plank', 60, false, '']]],
    ])
  })
})

describe('parseRoutine', () => {
  test('expands repeated blocks into rounds', () => {
    const routine = parseRoutine('# Core\n## Warm-up\nJacks 30s\n## Circuit ×2\nPlank 45s\n> straight\n~ Rest 15s', 7)
    expect(routine.id).toBe(7)
    expect(routine.title).toBe('Core')
    expect(routine.blocks).toEqual([
      { name: 'Warm-up', seconds: 30 },
      { name: 'Circuit', seconds: 120 },
    ])
    expect(routine.steps.map((s) => [s.label, s.seconds, s.rest, s.block, s.round, s.rounds, s.note])).toEqual([
      ['Jacks', 30, false, 0, 1, 1, ''],
      ['Plank', 45, false, 1, 1, 2, 'straight'],
      ['Rest', 15, true, 1, 1, 2, ''],
      ['Plank', 45, false, 1, 2, 2, 'straight'],
      ['Rest', 15, true, 1, 2, 2, ''],
    ])
  })

  test('fills in missing names', () => {
    expect(parseRoutine('##\nX 5s').blocks[0].name).toBe('Block 1')
    expect(parseRoutine('45s').steps[0].label).toBe('Go')
    expect(parseRoutine('~ 10s').steps[0].label).toBe('Rest')
    expect(parseRoutine('Plank 1m').title).toBe('Plank')
    expect(parseRoutine('').title).toBe('Untitled')
  })

  test('open-ended blocks have no total', () => {
    const routine = parseRoutine('## Stretch\nQuads\n~ Rest 10s')
    expect(routine.blocks[0].seconds).toBeNull()
    expect(totalSeconds(routine.steps)).toBeNull()
  })

  test('detects Romanian', () => {
    expect(parseRoutine('# Încălzire\nGenuflexiuni 30s').lang).toBe('ro-RO')
    expect(parseRoutine('# Workout\nSquat 30s').lang).toBeUndefined()
  })
})

describe('durations', () => {
  test.each([
    ['', null],
    ['open', null],
    ['45', 45],
    ['45s', 45],
    ['1:30', 90],
    ['2m', 120],
    ['1m 30s', 90],
    ['2 m', 120],
    ['0', null],
    ['abc', undefined],
    ['5m plank', undefined],
    ['1h', 3600],
  ])('readDuration(%j) = %j', (text, seconds) => {
    expect(readDuration(text)).toBe(seconds)
  })

  test.each([
    [5, '5s'],
    [59, '59s'],
    [60, '1m'],
    [90, '1:30'],
    [300, '5m'],
    [3600, '1h'],
    [3660, '1:01:00'],
    [5400, '1:30:00'],
  ])('durationText(%d) = %s and reads back', (seconds, text) => {
    expect(durationText(seconds)).toBe(text)
    expect(readDuration(text)).toBe(seconds)
  })

  test('splitDuration', () => {
    expect(splitDuration('Plank - 45s')).toEqual({ label: 'Plank -', seconds: 45 })
    expect(splitDuration('5m plank')).toEqual({ label: 'plank', seconds: 300 })
    expect(splitDuration('Goblet squat 1m 30s')).toEqual({ label: 'Goblet squat', seconds: 90 })
    expect(splitDuration('Squat 2')).toEqual({ label: 'Squat 2', seconds: null })
    expect(splitDuration('25m', true)).toEqual({ label: '', seconds: 1500 })
  })
})

describe('quickRoutine', () => {
  test.each([
    ['25m', 'Timer', 1500],
    ['25', 'Timer', 1500],
    ['1:30', 'Timer', 90],
    ['90s', 'Timer', 90],
    ['1h 15m', 'Timer', 4500],
    ['5m plank', 'plank', 300],
    ['1h 15m deep work', 'deep work', 4500],
    ['', 'Stopwatch', null],
  ])('%j starts %s for %j seconds', (text, title, seconds) => {
    const routine = quickRoutine(text)!
    expect(routine.quick).toBe(true)
    expect(routine.title).toBe(title)
    expect(routine.steps).toEqual([{ label: title, note: '', seconds, rest: false, block: 0, round: 1, rounds: 1 }])
  })

  test.each(['abc', 'Full body', '0'])('%j is not a timer', (text) => {
    expect(quickRoutine(text)).toBeNull()
  })
})

test('uniqueTimers keeps the newest of each timer', () => {
  expect(uniqueTimers(['5:00', '25m focus', '5m', '300s', '1:30', '25:00 Focus', '5m plank'])).toEqual(['5:00', '25m focus', '1:30', '5m plank'])
})

describe('library and titles', () => {
  test('stepLibrary ranks by use and keeps the most common shape', () => {
    const library = stepLibrary(['## A\nPlank 45s\n> core\n~ Rest 15s\nSquat 30s', '## B\nplank 45s\n> core\nPlank 1m\n~ Rest 15s'])
    expect(library).toEqual([
      { label: 'Plank', seconds: 45, note: 'core', rest: false },
      { label: 'Rest', seconds: 15, note: '', rest: true },
      { label: 'Squat', seconds: 30, note: '', rest: false },
    ])
  })

  test('uniqueTitle', () => {
    expect(uniqueTitle('Core', ['Legs'])).toBe('Core')
    expect(uniqueTitle('Core', ['core'])).toBe('Core copy')
    expect(uniqueTitle('Core copy', ['Core', 'Core copy'])).toBe('Core copy 2')
    expect(uniqueTitle('Ședință', ['sedinta'])).toBe('Ședință copy')
  })

  test('withTitle', () => {
    expect(withTitle('# Old\n## A\nX 5s', 'New')).toBe('# New\n## A\nX 5s')
    expect(withTitle('## A\nX 5s', 'New')).toBe('# New\n\n## A\nX 5s')
  })

  test('fold ignores case and diacritics', () => {
    expect(fold('Încălzire ȘI')).toBe('incalzire si')
  })
})
