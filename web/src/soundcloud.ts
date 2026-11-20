import type { Engine, Hooks, Source } from './music'

type Sound = { id: number; title: string; duration: number; artwork_url: string | null; policy?: string; user?: { username: string; avatar_url?: string } }
type Progress = { currentPosition: number }
type Widget = {
  bind(event: string, listener: (e: Progress) => void): void
  play(): void
  pause(): void
  next(): void
  prev(): void
  skip(index: number): void
  seekTo(ms: number): void
  setVolume(volume: number): void
  getCurrentSound(callback: (sound: Sound | null) => void): void
  getCurrentSoundIndex(callback: (index: number) => void): void
  isPaused(callback: (paused: boolean) => void): void
}

declare global {
  interface Window {
    SC?: { Widget: ((frame: HTMLIFrameElement) => Widget) & { Events: Record<string, string> } }
  }
}

const RESERVED = new Set(['discover', 'stream', 'search', 'you', 'upload', 'feed', 'charts', 'pages', 'settings', 'messages', 'notifications', 'people', 'tags', 'stations', 'pro', 'jobs', 'signin', 'logout', 'mobile', 'apps', 'terms-of-use'])
const ARTIST_PAGES = new Set(['tracks', 'popular-tracks', 'likes', 'reposts', 'albums', 'sets', 'followers', 'following', 'comments'])

/** Extract a track, playlist or artist from a SoundCloud link; short `on.soundcloud.com` links need `resolveSource`. */
export function parseSoundCloud(text: string): Source | null {
  const raw = text.trim()
  if (!/soundcloud\.com/i.test(raw)) return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m)\./, '')
  const parts = url.pathname.split('/').filter(Boolean)
  if (host === 'on.soundcloud.com') return parts.length === 1 ? { url: `https://on.soundcloud.com/${parts[0]}`, kind: 'soundcloud' } : null
  if (host !== 'soundcloud.com' || !parts.length || RESERVED.has(parts[0])) return null
  if (parts.length === 2 && ARTIST_PAGES.has(parts[1])) parts.length = 1
  const clean = `https://soundcloud.com/${parts.join('/')}`
  const list = parts.length === 1 || parts[1] === 'sets'
  return { url: clean, kind: 'soundcloud', ...(list && { list: clean }) }
}

/** Whether `source` is a short link the browser cannot open directly. */
export const isShortLink = (source: Source) => source.url.startsWith('https://on.soundcloud.com/')

let apiLoad: Promise<void> | null = null

function loadApi(): Promise<void> {
  apiLoad ??= new Promise<void>((resolve, reject) => {
    if (window.SC?.Widget) return resolve()
    const script = document.createElement('script')
    script.src = 'https://w.soundcloud.com/player/api.js'
    script.onload = () => resolve()
    script.onerror = () => {
      apiLoad = null
      reject(new Error('Couldn’t reach SoundCloud. Check your connection'))
    }
    document.head.append(script)
  })
  return apiLoad
}

const artwork = (sound: Sound) => (sound.artwork_url ?? sound.user?.avatar_url ?? '').replace('-large.', '-t500x500.') || undefined

/** Play a SoundCloud track, playlist or artist inside `host`, starting at track `start`. */
export async function soundcloud(host: HTMLElement, source: Source, hooks: Hooks, start = 0): Promise<Engine> {
  await loadApi()
  const frame = document.createElement('iframe')
  frame.allow = 'autoplay'
  frame.title = 'SoundCloud player'
  frame.src = `https://w.soundcloud.com/player/?${new URLSearchParams({
    url: source.url,
    auto_play: 'false',
    buying: 'false',
    sharing: 'false',
    download: 'false',
    show_comments: 'false',
    single_active: 'false',
    ...(start > 0 && { start_track: String(start) }),
  })}`
  host.replaceChildren(frame)
  const widget = window.SC!.Widget(frame)
  const events = window.SC!.Widget.Events
  let index = 0
  let duration = 0
  let ready = false
  let volume = 100
  let afterPlay: (() => boolean) | null = null

  const meta = (first = false) =>
    widget.getCurrentSound((sound) =>
      widget.getCurrentSoundIndex((i) => {
        index = Math.max(0, i)
        if (!sound) return first && hooks.update({ error: 'SoundCloud couldn’t open this link. Is it public?' })
        duration = sound.duration / 1000
        hooks.meta({ track: String(sound.id), title: sound.title, author: sound.user?.username ?? '', artwork: artwork(sound) })
        hooks.update({ error: sound.policy === 'SNIP' ? 'Preview only: SoundCloud plays 30 seconds of this track' : null })
        if (!first) return
        ready = true
        hooks.ready()
      }),
    )

  widget.bind(events.READY, () => meta(true))
  widget.bind(events.PLAY, () => {
    const then = afterPlay
    afterPlay = null
    if (then && !then()) hooks.update({ playing: false })
    else widget.isPaused((paused) => hooks.update({ playing: !paused }))
    meta()
  })
  widget.bind(events.PAUSE, () => hooks.update({ playing: false }))
  widget.bind(events.FINISH, () => {
    if (source.list) return
    widget.seekTo(0)
    widget.play()
  })
  widget.bind(events.PLAY_PROGRESS, (e) => hooks.progress(e.currentPosition / 1000, duration, index))
  widget.bind(events.ERROR, () => ready && hooks.update({ error: 'SoundCloud couldn’t play this track' }))

  return {
    play: () => widget.play(),
    pause: () => widget.pause(),
    next: () => widget.next(),
    prev: () => widget.prev(),
    setVolume(next) {
      volume = next
      widget.setVolume(next)
    },
    cue(target, seconds, autoplay) {
      if (target === index) {
        widget.seekTo(seconds * 1000)
        if (autoplay) widget.play()
        return
      }
      if (!autoplay) widget.setVolume(0)
      afterPlay = () => {
        widget.seekTo(seconds * 1000)
        if (autoplay) return true
        widget.pause()
        widget.setVolume(volume)
        return false
      }
      widget.skip(target)
    },
    destroy: () => frame.remove(),
  }
}
