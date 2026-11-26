import { describe, expect, test } from 'vitest'
import { HINTS, SOURCES, hasHints, hintNow, type Hint } from './hints'
import { allNames, MOVES } from './moves'
import { parseRoutine } from './routine'
import { advance, arm, finish, jump, pause, play, ready } from './timer'

const T0 = Date.UTC(2026, 10, 20, 7, 0, 0)
const at = (seconds: number) => T0 + seconds * 1000
const PREP = 5000
const entries = Object.entries(HINTS) as [keyof typeof HINTS, Hint][]
const cues = entries.flatMap(([id, hint]) => [hint.setup, hint.form].filter((cue) => cue !== undefined).map((cue) => ({ id, cue })))

describe('technique hints', () => {
  test('every hint belongs to a demo and names at least one https source', () => {
    expect(Object.keys(SOURCES).sort()).toEqual(Object.keys(HINTS).sort())
    for (const [id, hint] of entries) {
      expect(MOVES).toHaveProperty(id)
      expect(hint.setup ?? hint.form).toBeTruthy()
      expect(SOURCES[id].length).toBeGreaterThan(0)
      for (const url of SOURCES[id]) expect(url).toMatch(/^https:\/\/[^\s]+$/)
    }
  })

  test('cues are short, plain and fit one line on a phone', () => {
    for (const { cue } of cues) {
      expect(cue.length, cue).toBeLessThanOrEqual(42)
      expect(cue.split(' ').length, cue).toBeGreaterThanOrEqual(3)
      expect(cue, cue).toMatch(/^[A-Z][a-z]/)
      expect(cue, cue).not.toMatch(/[.!—–]$|—|–/)
    }
  })

  test('cues never name a side, because the figure mirrors for the other one', () => {
    for (const { cue } of cues) expect(cue.toLowerCase(), cue).not.toMatch(/\b(left|right)\b/)
  })

  test('a setup cue and a form cue of one exercise say different things', () => {
    for (const [, hint] of entries) expect(hint.setup).not.toBe(hint.form)
  })

  test('aliases and sides get the same hints as the main name', () => {
    const routine = (label: string) => parseRoutine(`# R\n${label} 30s`)
    const known: Partial<Record<string, Hint>> = HINTS
    for (const { id, name } of allNames().filter(({ id }) => id in HINTS)) expect(hintNow(arm(routine(name)), at(0)), name).toBe(known[id]?.setup ?? null)
    expect(hintNow(arm(routine('Side plank, left')), at(0))).toBe(HINTS.sidePlank.setup)
    expect(hintNow(arm(routine('KB swing')), at(0))).toBe(HINTS.kettlebellSwing.setup)
  })
})

describe('which hint shows when', () => {
  const routine = parseRoutine('# R\n## A ×2\nPush-ups 30s\n~ Rest 15s\nCrunch 30s\n> slow\nThoracic rotations 30s')
  const setup = HINTS.pushUp.setup
  const form = HINTS.pushUp.form

  test('the setup cue shows before starting and through the prep, then the form cue', () => {
    let run = arm(routine, PREP)
    expect(hintNow(run, at(0))).toBe(setup)
    run = play(run, at(0))
    expect(hintNow(run, at(1))).toBe(setup)
    expect(hintNow(run, at(4.9))).toBe(setup)
    expect(hintNow(run, at(5))).toBe(form)
    expect(hintNow(pause(run, at(20)), at(60))).toBe(form)
  })

  test('starting early ends the setup cue at once', () => {
    const run = ready(play(arm(routine, PREP), at(0)), at(2))
    expect(hintNow(run, at(2))).toBe(form)
  })

  test('without prep the form cue shows as soon as the exercise runs', () => {
    expect(hintNow(play(arm(routine), at(0)), at(0))).toBe(form)
  })

  test('a rest shows how to set up for the exercise coming next', () => {
    const run = advance(play(arm(routine, PREP), at(0)), at(36))
    expect(run.steps[run.index].rest).toBe(true)
    expect(hintNow(run, at(36))).toBe(HINTS.crunch.setup)
  })

  test('a note on the exercise takes the place of its hint', () => {
    const run = jump(play(arm(routine, PREP), at(0)), 2, at(1))
    expect(run.steps[run.index].note).toBe('slow')
    expect(hintNow(run, at(2))).toBeNull()
    expect(hintNow(run, at(10))).toBeNull()
  })

  test('unknown exercises and finished runs show nothing', () => {
    const run = play(arm(routine, PREP), at(0))
    expect(hintNow(jump(run, 3, at(1)), at(10))).toBeNull()
    expect(hintNow(finish(run, at(5)), at(6))).toBeNull()
  })

  test('every round shows the same cue', () => {
    const run = play(arm(routine, PREP), at(0))
    const second = jump(run, 4, at(1))
    expect(second.steps[second.index].round).toBe(2)
    expect(hintNow(second, at(2))).toBe(setup)
    expect(hintNow(second, at(7))).toBe(form)
  })

  test('the stage keeps a line only when some exercise has a hint', () => {
    expect(hasHints(routine.steps)).toBe(true)
    expect(hasHints(parseRoutine('# R\nThoracic rotations 30s\nFocus 25m').steps)).toBe(false)
  })
})
