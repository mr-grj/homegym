import { clock } from './format'
import type { Routine, Step } from './routine'

export type Run = {
  routine: Routine
  steps: Step[]
  index: number
  offset: number
  total: number
  since: number | null
  startedAt: string | null
  finishedAt: string | null
}

export const stepDuration = (step: Step) => (step.seconds === null ? null : step.seconds * 1000)
export const stepElapsed = (run: Run, now: number) => run.offset + (run.since === null ? 0 : now - run.since)
export const totalElapsed = (run: Run, now: number) => run.total + (run.since === null ? 0 : now - run.since)

/** Milliseconds left in the current step, or null when it is open-ended. */
export function stepRemaining(run: Run, now: number): number | null {
  const duration = stepDuration(run.steps[run.index])
  return duration === null ? null : Math.max(0, duration - stepElapsed(run, now))
}

/** Create a paused run positioned at the first step. */
export function arm(routine: Routine): Run {
  return { routine, steps: routine.steps, index: 0, offset: 0, total: 0, since: null, startedAt: null, finishedAt: null }
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
    next = { ...next, index: next.index + 1, offset: next.offset - limit }
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
  return { ...fold(run, now), index: Math.max(0, Math.min(run.steps.length - 1, index)), offset: 0, finishedAt: null }
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
  const seconds = Math.max(elapsed + 1, (step.seconds ?? elapsed) + delta)
  return { ...folded, steps: folded.steps.with(folded.index, { ...step, seconds }) }
}

/** Everything the screen needs to draw the current moment. */
export function face(run: Run, now: number, preferElapsed: boolean) {
  const step = run.steps[run.index]
  const elapsed = stepElapsed(run, now)
  const duration = stepDuration(step)
  const remaining = stepRemaining(run, now)
  const elapsedMode = preferElapsed || remaining === null
  const seconds = run.finishedAt
    ? Math.round(run.total / 1000)
    : elapsedMode
      ? Math.floor(elapsed / 1000)
      : Math.ceil((remaining ?? 0) / 1000)
  return {
    step,
    remaining,
    elapsedMode,
    display: clock(seconds),
    progress: run.finishedAt ? 1 : duration ? Math.min(1, elapsed / duration) : (elapsed % 60000) / 60000,
  }
}
