import type { Engine, Hooks, Source } from './music'

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
  destroy(): void
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, options: object) => YTPlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

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

let apiLoad: Promise<void> | null = null

function loadApi(): Promise<void> {
  apiLoad ??= new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) return resolve()
    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => {
      apiLoad = null
      reject(new Error('Couldn’t reach YouTube. Check your connection'))
    }
    document.head.append(script)
  })
  return apiLoad
}

/** Play a YouTube video or playlist inside `host`. */
export async function youtube(host: HTMLElement, source: Source, hooks: Hooks): Promise<Engine> {
  if (source.list === 'LM' && !source.videoId) throw new Error('Liked Music is private. Share a public or unlisted playlist instead')
  await loadApi()
  let player: YTPlayer | null = null
  let pollId = 0
  let cueingUntil = 0

  const meta = () => {
    const data = player?.getVideoData()
    if (!data?.video_id) return
    hooks.meta({ track: data.video_id, title: data.title, author: data.author, artwork: `https://i.ytimg.com/vi/${data.video_id}/mqdefault.jpg` })
  }

  const poll = () => {
    if (!player) return
    hooks.progress(player.getCurrentTime() || 0, player.getDuration() || 0, Math.max(0, player.getPlaylistIndex?.() ?? 0))
  }

  const target = document.createElement('div')
  host.replaceChildren(target)
  try {
    player = new window.YT!.Player(target, {
      width: '100%',
      height: '100%',
      ...(source.videoId && { videoId: source.videoId }),
      playerVars: {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        rel: 0,
        iv_load_policy: 3,
        origin: location.origin,
        ...(source.list ? { listType: 'playlist', list: source.list } : { loop: 1, playlist: source.videoId }),
      },
      events: {
        onReady: () => {
          hooks.ready()
          meta()
          pollId = window.setInterval(poll, 500)
        },
        onStateChange: (e: { data: number }) => {
          hooks.update({ playing: e.data === 1 || e.data === 3, ...(e.data === 1 && { error: null }) })
          meta()
          if (e.data === 5) {
            cueingUntil = 0
            hooks.settled()
          }
        },
        onError: (e: { data: number }) => {
          if ((e.data === 101 || e.data === 150 || e.data === 100) && source.list) {
            hooks.update({ error: 'Skipped a track YouTube won’t play outside its site' })
            player?.nextVideo()
          } else {
            hooks.update({ error: e.data === 101 || e.data === 150 ? 'This track can’t be played outside YouTube' : 'YouTube couldn’t play this link' })
          }
        },
      },
    })
  } catch {
    throw new Error('YouTube couldn’t open this link')
  }

  return {
    play: () => player?.playVideo(),
    pause: () => player?.pauseVideo(),
    next: () => player?.nextVideo(),
    prev: () => player?.previousVideo(),
    setVolume: (volume) => player?.setVolume(volume),
    busy: () => Date.now() < cueingUntil,
    cue(index, startSeconds, autoplay) {
      if (!player) return
      if (source.list) {
        const args = { listType: 'playlist', list: source.list, index, startSeconds }
        if (autoplay) player.loadPlaylist(args)
        else player.cuePlaylist(args)
      } else if (source.videoId) {
        const args = { videoId: source.videoId, startSeconds }
        if (autoplay) player.loadVideoById(args)
        else player.cueVideoById(args)
      } else return
      if (!autoplay) cueingUntil = Date.now() + 3000
    },
    destroy() {
      clearInterval(pollId)
      player?.destroy()
      player = null
    },
  }
}
