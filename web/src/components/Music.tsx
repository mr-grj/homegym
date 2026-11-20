import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type WheelEvent } from 'react'
import { clock } from '../format'
import { attach, music, parseYouTube, useMusic } from '../music'
import { useSetting } from '../store'
import { Icon } from './Icon'
import { tip } from './Tooltips'

const spot = (position: { index: number; time: number } | undefined, playlist: boolean) =>
  position && (playlist ? `track ${position.index + 1} · ${clock(position.time)}` : clock(position.time))

/** Floating mini player: card on wide screens, strip on narrow ones, disc when collapsed. */
export function MusicDock() {
  const m = useMusic()
  const host = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useSetting('homegym.music.collapsed', false)

  useEffect(() => (host.current ? attach(host.current) : undefined), [m.source?.url])

  if (!m.source) return null
  const thumb = m.videoId ? `https://i.ytimg.com/vi/${m.videoId}/mqdefault.jpg` : undefined
  const progress = m.duration ? m.position / m.duration : 0

  const onWheel = (e: WheelEvent) => music.setVolume(m.volume - Math.sign(e.deltaY) * 5)

  return (
    <aside
      className="music"
      data-collapsed={collapsed || undefined}
      data-playing={m.playing || undefined}
      style={{ '--t': progress } as CSSProperties}
      onWheel={onWheel}
    >
      <div className="yt" ref={host} />

      <button className="disc" onClick={() => setCollapsed(false)} {...tip(`Expand player: ${m.title || 'Music'}`)}>
        <span style={{ backgroundImage: thumb && `url(${thumb})` }} />
      </button>

      <div className="music-meta">
        <b>{m.error ?? (m.title || (m.ready ? 'Ready' : 'Loading…'))}</b>
        <small>
          {[m.error ? m.title : m.author, m.duration > 0 && `${clock(m.position)} / ${clock(m.duration)}`]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </div>

      <div className="music-controls">
        <button onClick={music.prev} {...tip('Previous track', '[')} disabled={!m.source.list}>
          <Icon name="prev" />
        </button>
        <button className="play" onClick={music.toggle} {...tip(m.playing ? 'Pause music' : 'Play music', 'M')}>
          <Icon name={m.playing ? 'pause' : 'play'} />
        </button>
        <button onClick={music.next} {...tip('Next track', ']')} disabled={!m.source.list}>
          <Icon name="next" />
        </button>
        <input
          className="volume"
          type="range"
          min={0}
          max={100}
          value={m.volume}
          onChange={(e) => music.setVolume(Number(e.target.value))}
          style={{ '--v': m.volume } as CSSProperties}
          {...tip(`Volume ${m.volume}% (or scroll over the player)`)}
        />
        <button
          className="toggle"
          data-on={m.follow || undefined}
          onClick={() => music.setFollow(!m.follow)}
          {...tip(m.follow ? 'Music follows the timer (on): plays, pauses and fades with it' : 'Music follows the timer (off): click to sync it')}
        >
          <Icon name="link" />
        </button>
        <button className="collapse" onClick={() => setCollapsed(true)} {...tip('Shrink to a disc')}>
          <Icon name="minimize" />
        </button>
        <button onClick={music.remove} {...tip('Remove music')}>
          <Icon name="close" />
        </button>
      </div>

      <i className="music-progress" />
    </aside>
  )
}

/** Picker for pasting a link or reusing a recent one. */
export function MusicPicker({ onDone }: { onDone: () => void }) {
  const m = useMusic()
  const [text, setText] = useState('')
  const source = parseYouTube(text)
  const invalid = text.trim() !== '' && !source
  const saved = m.source ? spot(m.positions[m.source.url], !!m.source.list) : undefined

  const load = (url: string) => {
    const parsed = parseYouTube(url)
    if (!parsed) return
    music.load(parsed)
    onDone()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !source) return
    e.preventDefault()
    load(text)
  }

  return (
    <div className="picker">
      <header className="sheet-head">
        <h2>Music</h2>
      </header>
      <div className="picker-entry" data-invalid={invalid || undefined}>
        <Icon name="music" />
        <input
          autoFocus
          value={text}
          placeholder="Paste a YouTube Music link"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (!parseYouTube(pasted)) return
            e.preventDefault()
            load(pasted)
          }}
          onKeyDown={onKeyDown}
        />
        {source && <kbd>⏎</kbd>}
      </div>
      {invalid && <p className="picker-error">That doesn’t look like a YouTube or YouTube Music link</p>}

      {m.recent.length > 0 && (
        <ul className="recent-music">
          {m.recent.map((r) => (
            <li key={r.url} data-active={r.url === m.source?.url || undefined}>
              <button className="grow" onClick={() => load(r.url)} {...tip(`Play “${r.label || r.url}”`)}>
                <Icon name={r.list ? 'list' : 'music'} />
                <span>{r.label || r.url}</span>
                <small>{[r.list && 'playlist', m.resume && spot(m.positions[r.url], !!r.list)].filter(Boolean).join(' · ')}</small>
              </button>
              <button className="icon-btn" onClick={() => music.forget(r.url)} {...tip('Forget this link')}>
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="follow">
        <input type="checkbox" checked={m.follow} onChange={(e) => music.setFollow(e.target.checked)} />
        <span>
          <b>Follow the timer</b>
          <small>Plays when you start, pauses when you pause, fades out when you finish.</small>
        </span>
      </label>

      <label className="follow">
        <input type="checkbox" checked={m.resume} onChange={(e) => music.setResume(e.target.checked)} />
        <span>
          <b>Resume where you left off</b>
          <small>Each playlist remembers its track and position across workouts, reloads and days.</small>
        </span>
        {m.source && saved && (
          <button
            className="btn ghost restart"
            onClick={(e) => {
              e.preventDefault()
              music.restart()
            }}
            {...tip(`Forget the saved spot (${saved}) and play from track 1`)}
          >
            Start from the beginning
          </button>
        )}
      </label>

      <ol className="howto">
        <li>
          In YouTube Music open a playlist, album or song → <b>Share</b> → <b>Copy link</b>.
        </li>
        <li>
          Press <kbd>⌘V</kbd> anywhere in homegym. Your recent links stay here.
        </li>
        <li>Signed in to YouTube in this browser? Premium carries over, so no ads.</li>
      </ol>
    </div>
  )
}
