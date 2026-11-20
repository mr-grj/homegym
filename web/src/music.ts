import { useSyncExternalStore } from 'react'
import { api } from './api'
import { isShortLink, parseSoundCloud, soundcloud } from './soundcloud'
import { onRemoteSetting, readLocal, saveSetting } from './store'
import { parseYouTube, youtube } from './youtube'

export type Source = { url: string; kind?: 'soundcloud'; videoId?: string; list?: string }
type Recent = Source & { label: string }
type Position = { index: number; videoId: string; time: number }

/** One playing service (YouTube, SoundCloud) behind the shared music store. */
export type Engine = {
  play(): void
  pause(): void
  next(): void
  prev(): void
  setVolume(volume: number): void
  cue(index: number, seconds: number, autoplay: boolean): void
  busy?(): boolean
  destroy(): void
}

/** Callbacks an engine uses to report back to the store. */
export type Hooks = {
  ready(): void
  update(patch: Partial<Pick<MusicState, 'playing' | 'error'>>): void
  meta(meta: { track: string; title: string; author: string; artwork?: string }): void
  progress(position: number, duration: number, index: number): void
  settled(): void
}

export type MusicState = {
  source: Source | null
  recent: Recent[]
  ready: boolean
  playing: boolean
  title: string
  author: string
  track: string | null
  artwork: string | null
  error: string | null
  volume: number
  position: number
  duration: number
  follow: boolean
  resume: boolean
  positions: Record<string, Position>
}

const STORE = 'homegym.music'
const DUCK = 0.18

type Saved = Pick<MusicState, 'source' | 'recent' | 'volume' | 'follow' | 'resume' | 'positions'>

const defaults: Saved = { source: null, recent: [], volume: 70, follow: true, resume: true, positions: {} }

const saved = ({ source, recent, volume, follow, resume, positions }: MusicState): Saved => ({
  source,
  recent,
  volume,
  follow,
  resume,
  positions,
})

let state: MusicState = {
  ...defaults,
  ...readLocal<Partial<Saved>>(STORE, {}),
  ready: false,
  playing: false,
  title: '',
  author: '',
  track: null,
  artwork: null,
  error: null,
  position: 0,
  duration: 0,
}

const listeners = new Set<() => void>()
let engine: Engine | null = null
let host: HTMLElement | null = null
let generation = 0
let pendingPlay = false
let level = 1
let rampId = 0
let restoreId = 0
let duckUntil = 0
let watchdogId = 0

let lastSaved = JSON.stringify(saved(state))

function set(patch: Partial<MusicState>, persist = true) {
  state = { ...state, ...patch }
  const snapshot = JSON.stringify(saved(state))
  if (snapshot !== lastSaved) {
    lastSaved = snapshot
    if (persist) saveSetting(STORE, saved(state))
  }
  listeners.forEach((listener) => listener())
}

onRemoteSetting(STORE, (value) => {
  const remote = { ...defaults, ...(value as Partial<Saved>) }
  const url = state.source?.url
  if (state.playing) {
    remote.source = state.source
    if (url && state.positions[url]) remote.positions = { ...remote.positions, [url]: state.positions[url] }
  }
  set(remote, false)
  applyVolume()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Subscribe a component to the music player state, or to the part `select` picks so other changes skip it. */
export function useMusic(): MusicState
export function useMusic<T>(select: (state: MusicState) => T): T
export function useMusic<T>(select?: (state: MusicState) => T) {
  return useSyncExternalStore(subscribe, () => (select ? select(state) : state))
}

/** Read a YouTube, YouTube Music or SoundCloud link. */
export const parseMusic = (text: string) => parseYouTube(text) ?? parseSoundCloud(text)

/** Expand a short link into one the player can open; throws with a message to show. */
export async function resolveSource(source: Source): Promise<Source> {
  if (!isShortLink(source)) return source
  if (import.meta.env.VITE_DEMO) throw new Error('Short links need the self-hosted app. Open the link and copy the full soundcloud.com address')
  const full = await api.resolveLink(source.url).then(
    (res) => parseSoundCloud(res.url),
    () => null,
  )
  if (!full || isShortLink(full)) throw new Error('Couldn’t open that short link. Try the full soundcloud.com address')
  return full
}

function applyVolume() {
  if (engine && state.ready) engine.setVolume(Math.round(state.volume * level))
}

function ramp(to: number, ms: number, done?: () => void) {
  clearInterval(rampId)
  const from = level
  const start = performance.now()
  rampId = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / ms)
    level = from + (to - from) * t
    applyVolume()
    if (t === 1) {
      clearInterval(rampId)
      done?.()
    }
  }, 40)
}

function meta({ track, title, author, artwork }: Parameters<Hooks['meta']>[0]) {
  const recent = state.recent.map((r) => (r.url === state.source?.url && !r.label ? { ...r, label: title } : r))
  set({ title, author, track, artwork: artwork ?? null, recent })
}

function progress(position: number, duration: number, index: number) {
  const patch: Partial<MusicState> = {}
  if (Math.abs(position - state.position) >= 0.5 || duration !== state.duration) Object.assign(patch, { position, duration })
  const url = state.source?.url
  const saved = url ? state.positions[url] : undefined
  if (url && state.playing && state.track && position > 1 && (!saved || saved.index !== index || Math.abs(saved.time - position) >= 2)) {
    patch.positions = { ...state.positions, [url]: { index, videoId: state.track, time: Math.floor(position) } }
  }
  if (Object.keys(patch).length) set(patch)
}

function begin(source: Source) {
  clearTimeout(watchdogId)
  set({ ready: true })
  applyVolume()
  const autoplay = pendingPlay
  pendingPlay = false
  const saved = state.resume ? state.positions[source.url] : undefined
  if (saved) engine?.cue(saved.index, Math.max(0, saved.time - 2), autoplay)
  else if (autoplay) engine?.play()
}

function build(current: number) {
  const source = state.source
  if (!host || !source) return
  const live = () => current === generation
  const name = source.kind === 'soundcloud' ? 'SoundCloud' : 'YouTube'
  const hooks: Hooks = {
    ready: () => live() && begin(source),
    update: (patch) => live() && set(patch),
    meta: (data) => live() && meta(data),
    progress: (...args) => live() && progress(...args),
    settled: () => live() && pendingPlay && music.play(),
  }
  set({ ready: false, playing: false, error: null, title: '', author: '', track: null, artwork: null, position: 0, duration: 0 })
  watchdogId = window.setTimeout(() => {
    if (live() && !state.ready && !state.error) set({ error: `${name} didn’t respond. Try the link again or another one` })
  }, 15_000)
  const start = state.resume ? (state.positions[source.url]?.index ?? 0) : 0
  const create = source.kind === 'soundcloud' ? soundcloud(host, source, hooks, start) : youtube(host, source, hooks)
  create.then(
    (made) => (live() ? (engine = made) : made.destroy()),
    (e: Error) => {
      if (!live()) return
      clearTimeout(watchdogId)
      set({ error: e.message })
    },
  )
}

/** Mount the player inside `el`; returns a cleanup function. */
export function attach(el: HTMLElement) {
  const current = ++generation
  host = el
  build(current)
  return () => {
    generation++
    clearTimeout(watchdogId)
    engine?.destroy()
    engine = null
    host = null
    set({ ready: false, playing: false })
  }
}

export const music = {
  load(source: Source, autoplay = false) {
    pendingPlay = autoplay
    const recent = [{ ...source, label: state.recent.find((r) => r.url === source.url)?.label ?? '' }, ...state.recent.filter((r) => r.url !== source.url)]
    const kept = recent.slice(0, 20)
    const positions = Object.fromEntries(Object.entries(state.positions).filter(([url]) => kept.some((r) => r.url === url)))
    set({ source, recent: kept, positions, error: null })
  },
  remove() {
    set({ source: null, title: '', author: '', track: null, artwork: null, error: null })
  },
  forget(url: string) {
    const positions = { ...state.positions }
    delete positions[url]
    set({ recent: state.recent.filter((r) => r.url !== url), positions })
  },
  restart() {
    const source = state.source
    if (!source) return
    const positions = { ...state.positions }
    delete positions[source.url]
    set({ positions })
    if (engine && state.ready) engine.cue(0, 0, state.playing)
  },
  setResume: (resume: boolean) => set({ resume }),
  play() {
    if (!state.source) return
    if (!engine || !state.ready || engine.busy?.()) {
      pendingPlay = true
      return
    }
    pendingPlay = false
    clearInterval(rampId)
    level = Date.now() < duckUntil ? DUCK : 1
    applyVolume()
    engine.play()
  },
  pause() {
    pendingPlay = false
    engine?.pause()
  },
  toggle() {
    if (state.playing) music.pause()
    else music.play()
  },
  next: () => engine?.next(),
  prev: () => engine?.prev(),
  setVolume(volume: number) {
    set({ volume: Math.max(0, Math.min(100, Math.round(volume))) })
    applyVolume()
  },
  setFollow: (follow: boolean) => set({ follow }),
  duck(ms: number) {
    if (!state.playing) return
    duckUntil = Math.max(duckUntil, Date.now() + ms)
    if (level > DUCK) ramp(DUCK, 250)
    clearTimeout(restoreId)
    restoreId = window.setTimeout(() => ramp(1, 900), duckUntil - Date.now())
  },
  fadeOut() {
    if (!state.playing) return
    clearTimeout(restoreId)
    ramp(0, 2200, () => {
      engine?.pause()
      level = 1
    })
  },
  get state() {
    return state
  },
}
