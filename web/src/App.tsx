import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { api, type RoutineRecord, type Session } from './api'
import { Editor } from './components/Editor'
import { Finish, type FinishForm } from './components/Finish'
import { Help } from './components/Help'
import { History } from './components/History'
import { Icon, type IconName } from './components/Icon'
import { Launcher } from './components/Launcher'
import { Logo } from './components/Logo'
import { Modal } from './components/Modal'
import { MusicDock, MusicPicker } from './components/Music'
import { tip, Tooltips } from './components/Tooltips'
import { exitLabel, Stage } from './components/Stage'
import { VoicePicker } from './components/Voice'
import { human } from './format'
import { music, parseMusic, resolveSource, useMusic, type Source } from './music'
import { parseRoutine, stepLibrary, type Routine } from './routine'
import { baseLang, cue, speak, unlockAudio, useWakeLock, vibrate } from './sound'
import { flushSettings, pullSettings, usePersistent, useSetting } from './store'
import { advance, arm, back, extend, face, finish, jump, pause, play, stepRemaining, type Run } from './timer'

export type Prefs = { sound: boolean; voice: boolean; elapsed: boolean }
type Panel = 'finish' | 'history' | 'help' | 'music' | 'voice' | { edit: RoutineRecord | null } | null
type Toast = { id: number; text: string; undo?: () => void; key?: string }

const phrases = (lang?: string) =>
  lang?.startsWith('ro') ? { next: 'Urmează', done: 'Gata. Bravo!' } : { next: 'Next', done: 'Done' }

export default function App() {
  const [records, setRecords] = useState<RoutineRecord[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [run, setRun] = usePersistent<Run | null>('homegym.run', null)
  const [prefs, setPrefs] = useSetting<Prefs>('homegym.prefs', { sound: true, voice: true, elapsed: false })
  const [recent, setRecent] = useSetting<string[]>('homegym.recent', [])
  const [voices, setVoices] = usePersistent<Record<string, string>>('homegym.voices', {})
  const [panel, setPanel] = useState<Panel>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const lastLeft = useRef(0)
  const launcher = useRef<HTMLInputElement>(null)
  const tunes = useMusic()

  const routines = useMemo(() => records.map((r) => parseRoutine(r.source, r.id)), [records])
  const library = useMemo(() => stepLibrary(records.map((r) => r.source)), [records])
  const langs = useMemo(() => {
    const found = new Map([['en', 'en']])
    for (const r of routines) if (r.lang && !found.has(baseLang(r.lang))) found.set(baseLang(r.lang), r.lang)
    return [...found.values()]
  }, [routines])
  const running = run?.since != null

  const notify = (text: string, undo?: () => void, key?: string) => setToast({ id: Date.now(), text, undo, key })
  const dropEditorToast = () => setToast((t) => (t?.key === '⌘Z' ? null : t))
  const loadRoutines = () => api.routines().then(setRecords, () => notify('API unreachable. Routines not loaded'))
  const loadSessions = () => api.sessions().then(setSessions, () => {})

  useEffect(() => {
    void loadRoutines()
    void loadSessions()
    void pullSettings().catch(() => {})
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pullSettings().catch(() => {})
      else flushSettings()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', flushSettings)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', flushSettings)
    }
  }, [])

  useEffect(() => {
    if (!panel || typeof panel !== 'object') dropEditorToast()
  }, [panel])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [running])

  useWakeLock(running)

  useEffect(() => {
    if (!run) {
      document.title = 'homegym'
      return
    }
    const f = face(run, now, prefs.elapsed)
    document.title = `${run.finishedAt ? '✓' : run.since === null ? '❚❚' : '▶'} ${f.display} · ${f.step.label}`
  }, [run, now, prefs.elapsed])

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

  const logQuick = async (done: Run, minimum = 1) => {
    const seconds = Math.round(done.total / 1000)
    if (seconds < minimum || !done.startedAt) return
    try {
      const saved = await api.createSession({
        title: done.routine.title,
        started_at: done.startedAt,
        ended_at: done.finishedAt ?? new Date().toISOString(),
        seconds,
        effort: null,
        notes: '',
        blocks: [],
      })
      void loadSessions()
      notify(`Logged ${done.routine.title} · ${human(seconds)}`, () => api.deleteSession(saved.id).then(loadSessions))
    } catch {
      notify('Could not log. Is the API running?')
    }
  }

  const follow = (playing: boolean) => {
    if (!music.state.follow || !music.state.source) return
    if (playing) music.play()
    else music.pause()
  }

  const loadMusic = async (link: Source) => {
    let source: Source
    try {
      source = await resolveSource(link)
    } catch (e) {
      return notify((e as Error).message)
    }
    const autoplay = running && music.state.follow
    music.load(source, autoplay)
    setPanel((p) => (p === 'music' ? null : p))
    notify(autoplay ? 'Music loaded' : music.state.follow ? 'Music ready. It starts with your timer' : 'Music ready. Press M to play')
  }

  const complete = (done: Run) => {
    if (music.state.follow) music.fadeOut()
    if (prefs.sound) cue.done()
    vibrate([200, 100, 200, 100, 400])
    if (prefs.voice) say(phrases(done.routine.lang).done, done.routine.lang)
    if (done.routine.quick) void logQuick(done)
    else setPanel('finish')
  }

  const onTick = useEffectEvent(() => {
    if (!run || run.since === null) return
    const next = advance(run, now)
    if (next !== run) {
      setRun(next)
      if (next.finishedAt) complete(next)
      else announce(next)
      return
    }
    const remaining = stepRemaining(run, now)
    const left = remaining === null ? 0 : Math.ceil(remaining / 1000)
    if (left !== lastLeft.current && left >= 1 && left <= 3 && (run.steps[run.index].seconds ?? 0) >= 10) {
      if (prefs.sound) cue.tick()
      if (prefs.sound || prefs.voice) music.duck(left * 1000 + (prefs.voice && !run.routine.quick ? 2600 : 900))
    }
    lastLeft.current = left
  })

  useEffect(() => onTick(), [now])

  const update = (next: Run, speakIfMoved = true) => {
    const t = Date.now()
    setRun(next)
    setNow(t)
    if ((run?.since != null) !== (next.since != null) && !next.finishedAt) follow(next.since != null)
    if (speakIfMoved && next.since !== null && next.offset === 0) announce(next)
  }

  const toggle = () => {
    unlockAudio()
    if (!run) return launcher.current?.focus()
    if (run.finishedAt) return run.routine.quick ? setRun(null) : setPanel('finish')
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

  const backStep = () => {
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
      void logQuick(finish(run, Date.now()), 5)
      return setRun(null)
    }
    setRun(pause(run, Date.now()))
    setPanel('finish')
  }

  const startQuick = (routine: Routine, text: string) => {
    unlockAudio()
    if (prefs.sound) cue.work()
    const t = Date.now()
    setRun(play(arm(routine), t))
    setNow(t)
    follow(true)
    if (text) setRecent((list) => [text, ...list.filter((x) => x !== text)].slice(0, 6))
  }

  const openRoutine = (routine: Routine) => {
    unlockAudio()
    setRun(arm(routine))
    setNow(Date.now())
  }

  const saveWorkout = async (form: FinishForm) => {
    if (!run) return
    const t = Date.now()
    const done = pause(run, t)
    try {
      const saved = await api.createSession({
        title: done.routine.title,
        started_at: done.startedAt ?? new Date(t).toISOString(),
        ended_at: done.finishedAt ?? new Date(t).toISOString(),
        seconds: Math.round(done.total / 1000),
        ...form,
      })
      setRun(null)
      setPanel(null)
      void loadSessions()
      notify('Workout saved', () => api.deleteSession(saved.id).then(loadSessions))
    } catch {
      notify('Could not save. Is the API running?')
    }
  }

  const discardWorkout = () => {
    setRun(null)
    setPanel(null)
    notify('Workout discarded')
  }

  const saveRoutine = async (id: number | null, source: string) => {
    try {
      const saved = id === null ? await api.createRoutine(source) : await api.updateRoutine(id, source)
      await loadRoutines()
      setPanel(null)
      if (run && !run.startedAt && run.routine.id === saved.id) setRun(arm(parseRoutine(saved.source, saved.id)))
    } catch {
      notify('Could not save the routine')
    }
  }

  const saveRoutineAsNew = async (source: string) => {
    try {
      const saved = await api.createRoutine(source)
      await loadRoutines()
      setPanel(null)
      notify(`Saved as “${parseRoutine(saved.source).title}”`, () => api.deleteRoutine(saved.id).then(loadRoutines))
    } catch {
      notify('Could not save the routine')
    }
  }

  const deleteRoutine = async (record: RoutineRecord) => {
    await api.deleteRoutine(record.id)
    await loadRoutines()
    setPanel(null)
    if (run && !run.startedAt && run.routine.id === record.id) setRun(null)
    notify(`Deleted ${parseRoutine(record.source).title}`, () => api.createRoutine(record.source).then(loadRoutines))
  }

  const deleteSession = async (session: Session) => {
    const { id, ...input } = session
    await api.deleteSession(id)
    await loadSessions()
    notify(`Deleted ${session.title}`, () => api.createSession(input).then(loadSessions))
  }

  const editRoutine = (id: number | null) => setPanel({ edit: records.find((r) => r.id === id) ?? null })

  const fullscreen = () =>
    document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen().catch(() => {})

  const flip = (key: keyof Prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    if (panel) {
      if (e.key === 'Escape' || panel === 'help') {
        e.preventDefault()
        setPanel(null)
      }
      return
    }
    if (e.target instanceof Element && e.target.closest('input, textarea')) return
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const anytime: Record<string, () => void> = {
      t: () => flip('elapsed'),
      s: () => flip('sound'),
      v: () => flip('voice'),
      f: fullscreen,
      h: () => setPanel('history'),
      '?': () => setPanel('help'),
      m: () => (music.state.source ? music.toggle() : setPanel('music')),
      '[': music.prev,
      ']': music.next,
      u: () => {
        toast?.undo?.()
        setToast(null)
      },
    }
    const during: Record<string, () => void> = {
      ' ': toggle,
      Enter: toggle,
      k: toggle,
      ArrowRight: skip,
      l: skip,
      n: skip,
      ArrowLeft: backStep,
      j: backStep,
      p: backStep,
      ArrowUp: () => extendBy(60),
      '+': () => extendBy(60),
      '=': () => extendBy(60),
      ArrowDown: () => extendBy(-60),
      '-': () => extendBy(-60),
      Escape: stop,
      e: () => run?.routine.id != null && editRoutine(run.routine.id),
    }
    const action = anytime[key] ?? (run ? during[key] : undefined)
    if (action) {
      e.preventDefault()
      action()
    } else if (!run && (key.length === 1 || key === 'Enter')) {
      launcher.current?.focus()
      if (key === '/' || key === 'Enter') e.preventDefault()
    }
  })

  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    if (e.target instanceof Element && e.target.closest('input, textarea')) return
    const source = parseMusic(e.clipboardData?.getData('text') ?? '')
    if (!source) return
    e.preventDefault()
    void loadMusic(source)
  })

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  const phase = !run ? 'idle' : run.finishedAt ? 'done' : run.steps[run.index].rest ? 'rest' : 'work'
  const tools: [IconName, string, string, () => void, boolean?][] = [
    ['music', tunes.source ? 'Change music' : 'Add music: paste a YouTube or SoundCloud link', '⌘V', () => setPanel('music'), !!tunes.source || undefined],
    [prefs.sound ? 'sound' : 'mute', `Beeps and chimes ${prefs.sound ? 'on' : 'off'}`, 'S', () => flip('sound'), prefs.sound],
    ['voice', `Voice ${prefs.voice ? 'on' : 'off'}: pick how it sounds`, 'V', () => setPanel('voice'), prefs.voice],
    ['expand', 'Fullscreen', 'F', fullscreen],
    ['history', 'History: everything you logged', 'H', () => setPanel('history')],
    ['help', 'Shortcuts and formats', '?', () => setPanel('help')],
  ]

  return (
    <div className="app" data-phase={phase} data-running={running || undefined} data-dock={tunes.source ? '' : undefined}>
      <header className="bar">
        <span className="brand">
          <Logo />
          <span className="brand-name">homegym</span>
          {import.meta.env.VITE_DEMO && (
            <a
              className="demo-badge"
              href="https://github.com/mr-grj/homegym"
              target="_blank"
              rel="noreferrer"
              {...tip('Demo: everything stays in this browser. Self-host it to sync across devices')}
            >
              Demo
            </a>
          )}
        </span>
        <div className="tools">
          {tools.map(([icon, text, key, action, on]) => (
            <button key={icon} className="icon-btn" data-tool={icon} data-off={on === false || undefined} onClick={action} {...tip(text, key)}>
              <Icon name={icon} />
            </button>
          ))}
          {run && (
            <button className="exit" onClick={stop} {...tip(exitLabel(run), 'Esc')}>
              <Icon name="close" />
              <kbd>Esc</kbd>
            </button>
          )}
        </div>
      </header>

      {run ? (
        <Stage
          run={run}
          now={now}
          prefs={prefs}
          onToggle={toggle}
          onSkip={skip}
          onBack={backStep}
          onStop={stop}
          onExtend={extendBy}
          onJump={jumpTo}
          onMode={() => flip('elapsed')}
        />
      ) : (
        <Launcher
          routines={routines}
          recent={recent}
          sessions={sessions}
          inputRef={launcher}
          onQuick={startQuick}
          onOpen={openRoutine}
          onEdit={editRoutine}
          onMusic={loadMusic}
        />
      )}

      {panel === 'finish' && run && (
        <Modal onClose={() => setPanel(null)}>
          <Finish run={run} onSave={saveWorkout} onDiscard={discardWorkout} />
        </Modal>
      )}
      {panel === 'history' && (
        <Modal onClose={() => setPanel(null)}>
          <History sessions={sessions} onDelete={deleteSession} />
        </Modal>
      )}
      {panel === 'music' && (
        <Modal onClose={() => setPanel(null)}>
          <MusicPicker onDone={() => setPanel(null)} />
        </Modal>
      )}
      {panel === 'voice' && (
        <Modal onClose={() => setPanel(null)}>
          <VoicePicker
            on={prefs.voice}
            langs={langs}
            chosen={voices}
            onToggle={() => flip('voice')}
            onChoose={(lang, name) => setVoices((v) => ({ ...v, [lang]: name ?? '' }))}
          />
        </Modal>
      )}
      {panel === 'help' && (
        <Modal onClose={() => setPanel(null)} wide>
          <Help />
        </Modal>
      )}
      {panel && typeof panel === 'object' && (
        <Modal onClose={() => setPanel(null)} wide>
          <Editor
            record={panel.edit}
            titles={routines.map((r) => r.title)}
            onSave={(source) => saveRoutine(panel.edit?.id ?? null, source)}
            onSaveAsNew={saveRoutineAsNew}
            onDelete={() => panel.edit && void deleteRoutine(panel.edit)}
            library={library}
            onToast={(text, undo) => (text === null ? dropEditorToast() : notify(text, undo, '⌘Z'))}
          />
        </Modal>
      )}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.()
                setToast(null)
              }}
              {...tip('Undo that', toast.key ?? 'U')}
            >
              Undo <kbd>{toast.key ?? 'U'}</kbd>
            </button>
          )}
        </div>
      )}

      <MusicDock />
      <Tooltips />
    </div>
  )
}
