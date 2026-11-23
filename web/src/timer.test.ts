import { describe, expect, test } from 'vitest'
import { clock, human } from './format'
import { parseRoutine, quickRoutine } from './routine'
import {
  advance,
  arm,
  back,
  countdown,
  extend,
  face,
  finish,
  jump,
  pause,
  plannedSeconds,
  play,
  preparing,
  prepFor,
  ready,
  stepElapsed,
  stepRemaining,
  totalElapsed,
  withPrep,
} from './timer'

const T0 = Date.UTC(2026, 10, 20, 7, 0, 0)
const at = (seconds: number) => T0 + seconds * 1000
const routine = parseRoutine('# R\n## A ×2\nWork 30s\n~ Rest 10s\n## B\nOpen')

describe('timer', () => {
  test('arm is paused at the first step', () => {
    const run = arm(routine)
    expect(run).toMatchObject({ index: 0, offset: 0, total: 0, since: null, startedAt: null, finishedAt: null })
    expect(advance(run, at(999))).toBe(run)
  })

  test('play starts the clock once', () => {
    const run = play(arm(routine), at(0))
    expect(run.since).toBe(at(0))
    expect(run.startedAt).toBe(new Date(at(0)).toISOString())
    expect(play(run, at(5))).toBe(run)
  })

  test('advance walks through steps and carries the overshoot', () => {
    const run = play(arm(routine), at(0))
    expect(advance(run, at(29.9))).toBe(run)
    const rest = advance(run, at(31))
    expect(rest.index).toBe(1)
    expect(stepElapsed(rest, at(31))).toBe(1000)
    const skipped = advance(run, at(75))
    expect(skipped.index).toBe(3)
    expect(stepElapsed(skipped, at(75))).toBe(5000)
    expect(totalElapsed(skipped, at(75))).toBe(75000)
  })

  test('an open step never ends on its own', () => {
    const run = advance(play(arm(routine), at(0)), at(80))
    expect(run.index).toBe(4)
    expect(advance(run, at(5000))).toBe(run)
    expect(stepRemaining(run, at(100))).toBeNull()
  })

  test('the last timed step finishes at its exact end', () => {
    const run = play(arm(quickRoutine('30s')!), at(0))
    const done = advance(run, at(31.5))
    expect(done.since).toBeNull()
    expect(done.total).toBe(30000)
    expect(done.finishedAt).toBe(new Date(at(30)).toISOString())
  })

  test('pause freezes and play resumes without losing time', () => {
    let run = play(arm(routine), at(0))
    run = pause(run, at(12))
    expect(stepElapsed(run, at(100))).toBe(12000)
    run = play(run, at(100))
    expect(stepElapsed(run, at(103))).toBe(15000)
    expect(totalElapsed(run, at(103))).toBe(15000)
  })

  test('back restarts the step, or goes to the previous one near its start', () => {
    const run = jump(play(arm(routine), at(0)), 2, at(0))
    expect(back(run, at(5)).index).toBe(2)
    expect(stepElapsed(back(run, at(5)), at(5))).toBe(0)
    expect(back(run, at(2)).index).toBe(1)
    expect(back(arm(routine), at(0)).index).toBe(0)
  })

  test('jump clamps and keeps the clock running', () => {
    const run = play(arm(routine), at(0))
    expect(jump(run, 99, at(3)).index).toBe(4)
    expect(jump(run, -1, at(3)).index).toBe(0)
    expect(jump(run, 2, at(3)).since).toBe(at(3))
    expect(jump(pause(run, at(3)), 2, at(4)).since).toBeNull()
  })

  test('extend changes only the current step and never ends it early', () => {
    const run = play(arm(routine), at(0))
    const longer = extend(run, 60, at(10))
    expect(longer.steps[0].seconds).toBe(90)
    expect(longer.steps[2].seconds).toBe(30)
    expect(extend(run, -60, at(10)).steps[0].seconds).toBe(11)
    expect(extend(run, 60, at(0)).routine).toBe(routine)
    const open = jump(run, 4, at(0))
    expect(extend(open, 60, at(20)).steps[4].seconds).toBe(80)
  })

  test('finish stops the clock where it is', () => {
    const done = finish(play(arm(routine), at(0)), at(42))
    expect(done.since).toBeNull()
    expect(done.total).toBe(42000)
    expect(done.finishedAt).toBe(new Date(at(42)).toISOString())
  })
})

describe('countdown', () => {
  const run = play(arm(routine), at(0))

  test('covers the last three seconds of steps of ten seconds or more', () => {
    expect(countdown(run, at(26.9))).toBeNull()
    expect(countdown(run, at(27))).toBe(3)
    expect(countdown(run, at(28.5))).toBe(2)
    expect(countdown(run, at(29.99))).toBe(1)
    expect(countdown(run, at(30))).toBe(0)
  })

  test('stays quiet when paused, open or short', () => {
    expect(countdown(pause(run, at(28)), at(28))).toBeNull()
    expect(countdown(jump(run, 4, at(0)), at(100))).toBeNull()
    const short = play(arm(quickRoutine('9s')!), at(0))
    expect(countdown(short, at(8))).toBeNull()
  })
})

describe('face', () => {
  const run = play(arm(routine), at(0))

  test('counts down by default and rounds up', () => {
    expect(face(run, at(0.2), false)).toMatchObject({ display: '0:30', elapsedMode: false, remaining: 29800 })
    expect(face(run, at(29.5), false).display).toBe('0:01')
    expect(face(run, at(15), false).progress).toBe(0.5)
  })

  test('elapsed mode counts up and rounds down', () => {
    expect(face(run, at(9.9), true)).toMatchObject({ display: '0:09', elapsedMode: true })
  })

  test('open steps always count up and fill once a minute', () => {
    const open = jump(run, 4, at(0))
    expect(face(open, at(75), false)).toMatchObject({ display: '1:15', elapsedMode: true, remaining: null, progress: 0.25 })
  })

  test('a finished run shows the total', () => {
    const done = advance(play(arm(quickRoutine('90s')!), at(0)), at(100))
    expect(face(done, at(200), false)).toMatchObject({ display: '1:30', progress: 1 })
  })
})

describe('prep', () => {
  const PREP = 5000
  const prepped = parseRoutine('# P\nWork 30s\n~ Rest 30s\nNext 20s\nShort 5s\nOpen\n~ Switch 15s')

  test('applies only to timed exercises of ten seconds or more', () => {
    const run = arm(prepped, PREP)
    expect(prepped.steps.map((_, i) => prepFor(run, i))).toEqual([PREP, 0, PREP, 0, 0, 0])
    expect(prepFor(arm(prepped), 0)).toBe(0)
    expect(arm(quickRoutine('5m')!).offset).toBe(0)
  })

  test('the first exercise waits for its prep, then runs its full length', () => {
    const run = play(arm(prepped, PREP), at(0))
    expect(preparing(arm(prepped, PREP), at(0))).toBe(false)
    expect(preparing(run, at(4.9))).toBe(true)
    expect(face(run, at(0.2), false)).toMatchObject({ preparing: true, display: '5', progress: 0 })
    expect(face(run, at(4.5), false).display).toBe('1')
    expect(stepRemaining(run, at(2))).toBe(30000)
    expect(face(run, at(5), false)).toMatchObject({ preparing: false, display: '0:30' })
    expect(advance(run, at(34.9))).toBe(run)
    expect(advance(run, at(35.5)).index).toBe(1)
  })

  test('counts down the prep and hands over from a rest without beeping twice', () => {
    const run = play(arm(prepped, PREP), at(0))
    expect(countdown(run, at(1.9))).toBeNull()
    expect([2, 3, 4.5].map((s) => countdown(run, at(s)))).toEqual([3, 2, 1])
    expect(countdown(run, at(32))).toBe(3)
    const rest = advance(run, at(35))
    expect(countdown(rest, at(63))).toBeNull()
    const next = jump(rest, 2, at(63))
    expect(stepElapsed(next, at(63))).toBe(-PREP)
    expect(countdown(next, at(66))).toBe(2)
  })

  test('advance carries the overshoot into the next prep', () => {
    const run = play(arm(prepped, PREP), at(0))
    const next = advance(run, at(66))
    expect(next.index).toBe(2)
    expect(stepElapsed(next, at(66))).toBe(-4000)
    const after = advance(run, at(91))
    expect(after.index).toBe(3)
    expect(stepElapsed(after, at(91))).toBe(1000)
    expect(totalElapsed(after, at(91))).toBe(91000)
  })

  test('ready starts the exercise now and does nothing after the prep', () => {
    const run = play(arm(prepped, PREP), at(0))
    const now = ready(run, at(2))
    expect(stepElapsed(now, at(2))).toBe(0)
    expect(stepElapsed(ready(now, at(10)), at(10))).toBe(8000)
    expect(totalElapsed(now, at(3))).toBe(3000)
  })

  test('turning prep off ends a running prep and skips later ones', () => {
    const run = withPrep(play(arm(prepped, PREP), at(0)), 0, at(1))
    expect(stepElapsed(run, at(1))).toBe(0)
    expect(jump(run, 2, at(1)).offset).toBe(0)
    expect(withPrep(arm(prepped), PREP, at(0)).prep).toBe(PREP)
  })

  test('planned length includes prep time', () => {
    expect(plannedSeconds(arm(parseRoutine('A 30s\n~ R 30s\nB 20s'), PREP))).toBe(90)
    expect(plannedSeconds(arm(prepped, PREP))).toBeNull()
  })

  test('extend during prep keeps the step at least a second long', () => {
    const run = play(arm(prepped, PREP), at(0))
    expect(extend(run, -60, at(1)).steps[0].seconds).toBe(1)
  })
})

describe('format', () => {
  test.each([
    [0, '0:00'],
    [59.6, '1:00'],
    [90, '1:30'],
    [3600, '1:00:00'],
    [-5, '0:00'],
  ])('clock(%d) = %s', (seconds, text) => {
    expect(clock(seconds)).toBe(text)
  })

  test.each([
    [45, '45s'],
    [90, '1m 30s'],
    [600, '10m'],
    [605, '10m'],
    [3600, '1h'],
    [5100, '1h 25m'],
  ])('human(%d) = %s', (seconds, text) => {
    expect(human(seconds)).toBe(text)
  })
})
