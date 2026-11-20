import { useSyncExternalStore } from 'react'
import { onRemoteSetting, readLocal, saveSetting } from './store'

export type Source = { url: string; videoId?: string; list?: string }
type Recent = Source & { label: string }
type Position = { index: number; videoId: string; time: number }
type Cue = { listType?: string; list?: string; index?: number; videoId?: string; startSeconds: number }

type YTPlayer = {
  playVideo(): void
  pauseVideo(): void
  nextVideo(): void
  previousVideo(): void
  setVolume(volume: number): void
  getCurrentTime(): number
  getDuration(): number
  getVideoData(): { video_id: string; title: string; author: string }
  getPlaylistIndex(): number
  cuePlaylist(cue: Cue): void
  loadPlaylist(cue: Cue): void
  cueVideoById(cue: Cue): void
  loadVideoById(cue: Cue): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, options: object) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

export type MusicState = {
  source: Source | null
  recent: Recent[]
  ready: boolean
  playing: boolean
  title: string
  author: string
  videoId: string | null
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
  videoId: null,
  error: null,
  position: 0,
  duration: 0,
}

const listeners = new Set<() => void>()
let player: YTPlayer | null = null
let host: HTMLElement | null = null
let generation = 0
let apiLoad: Promise<void> | null = null
let pendingPlay = false
let level = 1
let rampId = 0
let restoreId = 0
let duckUntil = 0
let pollId = 0
let watchdogId = 0
let cueingUntil = 0

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

/** Subscribe a component to the music player state. */
export const useMusic = () => useSyncExternalStore(subscribe, () => state)

/** Extract a video and/or playlist from any YouTube or YouTube Music link. */
export function parseYouTube(text: string): Source | null {
  const raw = text.trim()
  if (!/youtu\.?be/i.test(raw)) return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let videoId = url.searchParams.get('v') ?? undefined
  if (host === 'youtu.be') videoId = url.pathname.split('/')[1] || undefined
  else if (host !== 'youtube.com') return null
  videoId ??= url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1]
  const list = url.searchParams.get('list') ?? undefined
  return videoId || list ? { url: raw, videoId, list } : null
}

function loadApi(): Promise<void> {
  apiLoad ??= new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) return resolve()
    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => {
      apiLoad = null
      reject(new Error('YouTube is unreachable'))
    }
    document.head.append(script)
  })
  return apiLoad
}

function applyVolume() {
  if (player && state.ready) player.setVolume(Math.round(state.volume * level))
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

function refreshMeta() {
  if (!player || !state.ready) return
  const data = player.getVideoData()
  if (!data?.video_id) return
  const recent = state.recent.map((r) => (r.url === state.source?.url && !r.label ? { ...r, label: data.title } : r))
  set({ title: data.title, author: data.author, videoId: data.video_id, recent })
}

function poll() {
  if (!player || !state.ready) return
  const position = player.getCurrentTime() || 0
  const duration = player.getDuration() || 0
  const patch: Partial<MusicState> = {}
  if (Math.abs(position - state.position) >= 0.5 || duration !== state.duration) Object.assign(patch, { position, duration })
  const url = state.source?.url
  const index = Math.max(0, player.getPlaylistIndex?.() ?? 0)
  const saved = url ? state.positions[url] : undefined
  if (url && state.playing && state.videoId && position > 1 && (!saved || saved.index !== index || Math.abs(saved.time - position) >= 2)) {
    patch.positions = { ...state.positions, [url]: { index, videoId: state.videoId, time: Math.floor(position) } }
  }
  if (Object.keys(patch).length) set(patch)
}

function cue(source: Source, index: number, startSeconds: number, autoplay: boolean) {
  if (!player) return
  if (source.list) {
    const args = { listType: 'playlist', list: source.list, index, startSeconds }
    if (autoplay) player.loadPlaylist(args)
    else player.cuePlaylist(args)
    if (!autoplay) cueingUntil = Date.now() + 3000
  } else if (source.videoId) {
    const args = { videoId: source.videoId, startSeconds }
    if (autoplay) player.loadVideoById(args)
    else player.cueVideoById(args)
    if (!autoplay) cueingUntil = Date.now() + 3000
  }
}

function start(source: Source) {
  const autoplay = pendingPlay
  pendingPlay = false
  const saved = state.resume ? state.positions[source.url] : undefined
  if (saved) cue(source, saved.index, Math.max(0, saved.time - 2), autoplay)
  else if (autoplay) player?.playVideo()
}

function build() {
  player?.destroy()
  player = null
  clearInterval(pollId)
  clearTimeout(watchdogId)
  const source = state.source
  if (!host || !source || !window.YT) return
  if (source.list === 'LM' && !source.videoId) {
    set({ error: 'Liked Music is private. Share a public or unlisted playlist instead' })
    return
  }
  const target = document.createElement('div')
  host.replaceChildren(target)
  const playerVars: Record<string, unknown> = {
    playsinline: 1,
    controls: 0,
    disablekb: 1,
    rel: 0,
    iv_load_policy: 3,
    origin: location.origin,
    ...(source.list
      ? { listType: 'playlist', list: source.list }
      : { loop: 1, playlist: source.videoId }),
  }
  const events = handlers(source)
  set({ ready: false, playing: false, error: null, title: '', author: '', position: 0, duration: 0 })
  watchdogId = window.setTimeout(() => {
    if (!state.ready) set({ error: 'YouTube didn’t respond. Try the link again or another one' })
  }, 15_000)
  try {
    player = new window.YT.Player(target, {
      width: '100%',
      height: '100%',
      ...(source.videoId && { videoId: source.videoId }),
      playerVars,
      events,
    })
  } catch {
    clearTimeout(watchdogId)
    set({ error: 'YouTube couldn’t open this link' })
  }
}

function handlers(source: Source) {
  return {
    onReady: () => {
      clearTimeout(watchdogId)
      set({ ready: true })
      applyVolume()
      start(source)
      refreshMeta()
      pollId = window.setInterval(poll, 500)
    },
    onStateChange: (e: { data: number }) => {
      set({ playing: e.data === 1 || e.data === 3, ...(e.data === 1 && { error: null }) })
      refreshMeta()
      if (e.data === 5) {
        cueingUntil = 0
        if (pendingPlay) music.play()
      }
    },
    onError: (e: { data: number }) => {
      if ((e.data === 101 || e.data === 150 || e.data === 100) && source.list) {
        set({ error: 'Skipped a track YouTube won’t play outside its site' })
        player?.nextVideo()
      } else {
        set({ error: e.data === 101 || e.data === 150 ? 'This track can’t be played outside YouTube' : 'YouTube couldn’t play this link' })
      }
    },
  }
}

/** Mount the player inside `el`; returns a cleanup function. */
export function attach(el: HTMLElement) {
  const current = ++generation
  host = el
  loadApi().then(
    () => current === generation && build(),
    () => set({ error: 'Couldn’t reach YouTube. Check your connection' }),
  )
  return () => {
    generation++
    clearInterval(pollId)
    clearTimeout(watchdogId)
    player?.destroy()
    player = null
    host = null
    set({ ready: false, playing: false })
  }
}

export const music = {
  load(source: Source, autoplay = false) {
    pendingPlay = autoplay
    const recent = [{ ...source, label: state.recent.find((r) => r.url === source.url)?.label ?? '' }, ...state.recent.filter((r) => r.url !== source.url)]
    const kept = recent.slice(0, 5)
    const positions = Object.fromEntries(Object.entries(state.positions).filter(([url]) => kept.some((r) => r.url === url)))
    set({ source, recent: kept, positions, error: null })
  },
  remove() {
    set({ source: null, title: '', author: '', videoId: null, error: null })
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
    if (player && state.ready) cue(source, 0, 0, state.playing)
  },
  setResume: (resume: boolean) => set({ resume }),
  play() {
    if (!state.source) return
    if (!player || !state.ready || Date.now() < cueingUntil) {
      pendingPlay = true
      return
    }
    pendingPlay = false
    clearInterval(rampId)
    level = Date.now() < duckUntil ? DUCK : 1
    applyVolume()
    player.playVideo()
  },
  pause() {
    pendingPlay = false
    player?.pauseVideo()
  },
  toggle() {
    if (state.playing) music.pause()
    else music.play()
  },
  next: () => player?.nextVideo(),
  prev: () => player?.previousVideo(),
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
      player?.pauseVideo()
      level = 1
    })
  },
  get state() {
    return state
  },
}
