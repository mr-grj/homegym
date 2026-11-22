import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from 'react'
import { music } from './music'
import type { Routine } from './routine'
import { baseLang, cue, speak, unlockAudio, useWakeLock, vibrate } from './sound'
import { usePersistent } from './store'
import { advance, arm, back, countdown, extend, face, finish, jump, pause, play, type Run } from './timer'

export type Prefs = { sound: boolean; voice: boolean; elapsed: boolean; demos: boolean }

export const PREFS: Prefs = { sound: true, voice: true, elapsed: false, demos: true }

const TICK_MS = 100
const TICKER = 'onmessage = (e) => setInterval(() => postMessage(0), e.data)'

let now = Date.now()
const listeners = new Set<() => void>()
let tickerUrl: string | undefined

function setNow(time: number) {
  now = time
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** The moment the timer shows, refreshed every 100 ms while it runs. */
export const useNow = () => useSyncExternalStore(subscribe, () => now)

function pageTicker(ms: number, tick: () => void) {
  const id = setInterval(tick, ms)
  return () => clearInterval(id)
}

function workerTicker(ms: number, tick: () => void) {
  let stopFallback: (() => void) | undefined
  try {
    tickerUrl ??= URL.createObjectURL(new Blob([TICKER], { type: 'text/javascript' }))
    const worker = new Worker(tickerUrl)
    worker.onmessage = tick
    worker.onerror = () => {
      worker.terminate()
      stopFallback = pageTicker(ms, tick)
    }
    worker.postMessage(ms)
    return () => {
      worker.terminate()
      stopFallback?.()
    }
  } catch {
    return pageTicker(ms, tick)
  }
}

/** Call `tick` every `ms`, from a worker while the tab is hidden because browsers throttle hidden pages' timers. */
function every(ms: number, tick: () => void) {
  const start = () => (document.hidden ? workerTicker(ms, tick) : pageTicker(ms, tick))
  let stop = start()
  const restart = () => {
    stop()
    stop = start()
  }
  document.addEventListener('visibilitychange', restart)
  return () => {
    document.removeEventListener('visibilitychange', restart)
    stop()
  }
}

const phrases = (lang?: string) =>
  lang?.startsWith('ro') ? { next: 'Urmează', done: 'Gata. Bravo!' } : { next: 'Next', done: 'Done' }

type Options = {
  prefs: Prefs
  voices: Record<string, string>
  /** A quick timer ended: log it if it ran for at least `minimum` seconds. */
  onLog: (run: Run, minimum: number) => void
  /** A routine ended or was stopped: show the finish sheet. */
  onReview: () => void
}

/** The timer on screen: its state, ticking, cues, music that follows it, and every control. */
export function useWorkout({ prefs, voices, onLog, onReview }: Options) {
  const [run, setRun] = usePersistent<Run | null>('homegym.run', null)
  const lastLeft = useRef(0)
  const running = run?.since != null

  const title = (time: number) => {
    if (!run) return 'homegym'
    const f = face(run, time, prefs.elapsed)
    return `${run.finishedAt ? '✓' : run.since === null ? '❚❚' : '▶'} ${f.display} · ${f.step.label}`
  }

  const say = (text: string, lang?: string) => speak(text, lang, voices[baseLang(lang)])

  const announce = (next: Run) => {
    const step = next.steps[next.index]
    if (prefs.sound) (step.rest ? cue.rest : cue.work)()
    vibrate(step.rest ? [80] : [120, 60, 120])
    if (!prefs.voice || next.routine.quick) return
    music.duck(2800)
    const after = next.steps[next.index + 1]
    const text = step.rest && after ? `${step.label}. ${phrases(next.routine.lang).next}: ${after.label}` : step.label
    setTimeout(() => say(text, next.routine.lang), 350)
  }

  const follow = (playing: boolean) => {
    if (!music.state.follow || !music.state.source) return
    if (playing) music.play()
    else music.pause()
  }

  const complete = (done: Run) => {
    if (music.state.follow) music.fadeOut()
    if (prefs.sound) cue.done()
    vibrate([200, 100, 200, 100, 400])
    if (prefs.voice) say(phrases(done.routine.lang).done, done.routine.lang)
    if (done.routine.quick) onLog(done, 1)
    else onReview()
  }

  const onTick = useEffectEvent(() => {
    const t = Date.now()
    setNow(t)
    if (!run || run.since === null) return
    const next = advance(run, t)
    if (next !== run) {
      setRun(next)
      if (next.finishedAt) complete(next)
      else announce(next)
      return
    }
    document.title = title(t)
    const left = countdown(run, t) ?? 0
    if (left >= 1 && left !== lastLeft.current) {
      if (prefs.sound) cue.tick()
      if (prefs.sound || prefs.voice) music.duck(left * 1000 + (prefs.voice && !run.routine.quick ? 2600 : 900))
    }
    lastLeft.current = left
  })

  useEffect(() => {
    if (!running) return
    onTick()
    return every(TICK_MS, onTick)
  }, [running])

  useEffect(() => {
    document.title = title(now)
  }, [run, prefs.elapsed])

  useWakeLock(running)

  const update = (next: Run, speakIfMoved = true) => {
    const t = Date.now()
    setRun(next)
    setNow(t)
    if ((run?.since != null) !== (next.since != null) && !next.finishedAt) follow(next.since != null)
    if (speakIfMoved && next.since !== null && next.offset === 0) announce(next)
  }

  const toggle = () => {
    unlockAudio()
    if (!run) return
    if (run.finishedAt) return run.routine.quick ? setRun(null) : onReview()
    const t = Date.now()
    update(run.since === null ? play(run, t) : pause(run, t))
  }

  const skip = () => {
    if (!run || run.finishedAt) return
    const t = Date.now()
    const last = run.index === run.steps.length - 1
    if (last && !run.startedAt) return
    const next = last ? finish(run, t) : jump(run, run.index + 1, t)
    update(next)
    if (next.finishedAt) complete(next)
  }

  const stepBack = () => {
    if (!run || (run.finishedAt && run.routine.quick)) return
    update(back(run, Date.now()))
  }

  const jumpTo = (index: number) => {
    if (!run || (run.finishedAt && run.routine.quick)) return
    update(jump(run, index, Date.now()))
  }

  const extendBy = (seconds: number) => {
    if (!run || run.finishedAt) return
    update(extend(run, seconds, Date.now()), false)
  }

  const stop = () => {
    if (!run) return
    if (!run.startedAt || (run.finishedAt && run.routine.quick)) return setRun(null)
    follow(false)
    if (run.routine.quick) {
      onLog(finish(run, Date.now()), 5)
      return setRun(null)
    }
    setRun(pause(run, Date.now()))
    onReview()
  }

  const startQuick = (routine: Routine) => {
    unlockAudio()
    if (prefs.sound) cue.work()
    const t = Date.now()
    setRun(play(arm(routine), t))
    setNow(t)
    follow(true)
  }

  const open = (routine: Routine) => {
    unlockAudio()
    setRun(arm(routine))
    setNow(Date.now())
  }

  return { run, running, setRun, toggle, skip, stepBack, jumpTo, extendBy, stop, startQuick, open }
}
