import { clock } from './format'
import { totalSeconds, type Routine, type Step } from './routine'

export type Run = {
  routine: Routine
  steps: Step[]
  index: number
  offset: number
  total: number
  since: number | null
  startedAt: string | null
  finishedAt: string | null
  prep?: number
}

export const stepDuration = (step: Step) => (step.seconds === null ? null : step.seconds * 1000)
export const stepElapsed = (run: Run, now: number) => run.offset + (run.since === null ? 0 : now - run.since)
export const totalElapsed = (run: Run, now: number) => run.total + (run.since === null ? 0 : now - run.since)

/** Milliseconds left in the current step, or null when it is open-ended. */
export function stepRemaining(run: Run, now: number): number | null {
  const duration = stepDuration(run.steps[run.index])
  return duration === null ? null : Math.max(0, duration - Math.max(0, stepElapsed(run, now)))
}

const COUNTDOWN_SECONDS = 3
const COUNTDOWN_MIN_STEP = 10

/** Seconds of "get into position" time before each exercise when it is on. */
export const PREP_SECONDS = 5

/** Seconds a sip of water adds to a rest. */
export const SIP_SECONDS = 15

const timedExercise = (step: Step) => !step.rest && (step.seconds ?? 0) >= COUNTDOWN_MIN_STEP

/** Milliseconds of "get into position" time before step `index`: exercises of 10s or more, when prep is on. */
export const prepFor = (run: Pick<Run, 'steps' | 'prep'>, index: number) => (run.prep && timedExercise(run.steps[index]) ? run.prep : 0)

/** True while a started run counts down the time to get into position. */
export const preparing = (run: Run, now: number) => !!run.startedAt && !run.finishedAt && stepElapsed(run, now) < 0

/** Whole seconds left (0 to 3) while a running step of at least 10s ends or its prep runs out, otherwise null. */
export function countdown(run: Run, now: number): number | null {
  if (run.since === null) return null
  const elapsed = stepElapsed(run, now)
  if (elapsed < 0) return -elapsed > COUNTDOWN_SECONDS * 1000 ? null : Math.ceil(-elapsed / 1000)
  const remaining = stepRemaining(run, now)
  const step = run.steps[run.index]
  const long = (step.seconds ?? 0) >= COUNTDOWN_MIN_STEP
  const handover = step.rest && run.index < run.steps.length - 1 && prepFor(run, run.index + 1) > 0
  if (remaining === null || remaining > COUNTDOWN_SECONDS * 1000 || !long || handover) return null
  return Math.ceil(remaining / 1000)
}

/** Planned length in seconds including prep time, or null when any step is open-ended. */
export function plannedSeconds(run: Run): number | null {
  const steps = totalSeconds(run.steps)
  return steps === null ? null : steps + run.steps.reduce((sum, _, i) => sum + prepFor(run, i), 0) / 1000
}

/** Create a paused run positioned at the first step, with `prep` milliseconds before each exercise. */
export function arm(routine: Routine, prep = 0): Run {
  const run = { routine, steps: routine.steps, index: 0, offset: 0, total: 0, since: null, startedAt: null, finishedAt: null, prep }
  return { ...run, offset: -prepFor(run, 0) || 0 }
}

function fold(run: Run, now: number): Run {
  if (run.since === null) return run
  return { ...run, offset: stepElapsed(run, now), total: totalElapsed(run, now), since: now }
}

/** Move past every step whose time is up; returns the same object when nothing changed. */
export function advance(run: Run, now: number): Run {
  const duration = stepDuration(run.steps[run.index])
  if (run.since === null || duration === null || stepElapsed(run, now) < duration) return run
  let next = fold(run, now)
  for (;;) {
    const limit = stepDuration(next.steps[next.index])
    if (limit === null || next.offset < limit) return next
    if (next.index === next.steps.length - 1) {
      const overshoot = next.offset - limit
      return { ...next, offset: limit, total: next.total - overshoot, since: null, finishedAt: new Date(now - overshoot).toISOString() }
    }
    next = { ...next, index: next.index + 1, offset: next.offset - limit - prepFor(next, next.index + 1) }
  }
}

/** Start or resume the clock. */
export function play(run: Run, now: number): Run {
  if (run.finishedAt || run.since !== null) return run
  return { ...run, since: now, startedAt: run.startedAt ?? new Date(now).toISOString() }
}

/** Freeze the clock. */
export function pause(run: Run, now: number): Run {
  return { ...fold(run, now), since: null }
}

/** Stop the clock and mark the run as finished. */
export function finish(run: Run, now: number): Run {
  return { ...pause(run, now), finishedAt: new Date(now).toISOString() }
}

/** Go to the start of a step, keeping the clock running if it was. */
export function jump(run: Run, index: number, now: number): Run {
  const target = Math.max(0, Math.min(run.steps.length - 1, index))
  return { ...fold(run, now), index: target, offset: -prepFor(run, target) || 0, finishedAt: null }
}

/** End the prep early and start the exercise clock now. */
export function ready(run: Run, now: number): Run {
  const folded = fold(run, now)
  return folded.offset < 0 ? { ...folded, offset: 0 } : folded
}

/** Turn prep time on (`prep` milliseconds) or off for the steps ahead; turning it off ends a running prep. */
export function withPrep(run: Run, prep: number, now: number): Run {
  return { ...(prep ? run : ready(run, now)), prep }
}

/** Restart the current step, or go to the previous one if it just began. */
export function back(run: Run, now: number): Run {
  return jump(run, stepElapsed(run, now) > 3000 || run.finishedAt ? run.index : run.index - 1, now)
}

/** Lengthen or shorten the current step by `delta` seconds. */
export function extend(run: Run, delta: number, now: number): Run {
  const folded = fold(run, now)
  const step = folded.steps[folded.index]
  const elapsed = Math.ceil(folded.offset / 1000)
  const seconds = Math.max(1, elapsed + 1, (step.seconds ?? elapsed) + delta)
  return { ...folded, steps: folded.steps.with(folded.index, { ...step, seconds }) }
}

/** Everything the screen needs to draw the current moment. */
export function face(run: Run, now: number, preferElapsed: boolean) {
  const step = run.steps[run.index]
  const raw = stepElapsed(run, now)
  const elapsed = Math.max(0, raw)
  const duration = stepDuration(step)
  const remaining = stepRemaining(run, now)
  const elapsedMode = preferElapsed || remaining === null
  const prep = preparing(run, now)
  const seconds = run.finishedAt
    ? Math.round(run.total / 1000)
    : elapsedMode
      ? Math.floor(elapsed / 1000)
      : Math.ceil((remaining ?? 0) / 1000)
  return {
    step,
    remaining,
    elapsedMode,
    preparing: prep,
    display: prep ? String(Math.ceil(-raw / 1000)) : clock(seconds),
    progress: run.finishedAt ? 1 : duration ? Math.min(1, elapsed / duration) : (elapsed % 60000) / 60000,
  }
}
