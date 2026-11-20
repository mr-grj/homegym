import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type WheelEvent } from 'react'
import { clock } from '../format'
import { attach, music, parseMusic, resolveSource, useMusic } from '../music'
import { useSetting } from '../store'
import { Icon } from './Icon'
import { tip } from './Tooltips'

const spot = (position: { index: number; time: number } | undefined, playlist: boolean) =>
  position && (playlist ? `track ${position.index + 1} · ${clock(position.time)}` : clock(position.time))

/** YouTube and SoundCloud logos, for the link placeholder. */
function Brands() {
  return (
    <span className="brands">
      <svg viewBox="0 0 28 20" role="img" aria-label="YouTube">
        <rect width="28" height="20" rx="5.5" fill="#ff0033" />
        <path d="M11 5.6v8.8l7.6-4.4z" fill="#fff" />
      </svg>
      <svg viewBox="0 0 32 16" role="img" aria-label="SoundCloud">
        <g fill="#ff5500">
          <rect x="0" y="9" width="1.6" height="6" rx="0.8" />
          <rect x="3" y="7" width="1.6" height="8" rx="0.8" />
          <rect x="6" y="5" width="1.6" height="10" rx="0.8" />
          <rect x="9" y="3.5" width="1.6" height="11.5" rx="0.8" />
          <path d="M12.2 15V3.2A7 7 0 0 1 24.6 6.8 4.2 4.2 0 1 1 27.8 15z" />
        </g>
      </svg>
    </span>
  )
}

/** Floating mini player: card on wide screens, strip on narrow ones, disc when collapsed. */
export function MusicDock() {
  const m = useMusic()
  const host = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useSetting('homegym.music.collapsed', false)

  useEffect(() => (host.current ? attach(host.current) : undefined), [m.source?.url])

  if (!m.source) return null
  const thumb = m.artwork ?? undefined
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
      <div className="yt" ref={host} data-kind={m.source.kind} style={{ backgroundImage: m.source.kind && thumb ? `url(${thumb})` : undefined }} />

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
  const [failure, setFailure] = useState('')
  const source = parseMusic(text)
  const invalid = text.trim() !== '' && !source
  const saved = m.source ? spot(m.positions[m.source.url], !!m.source.list) : undefined

  const load = (url: string) => {
    const parsed = parseMusic(url)
    if (!parsed) return
    setFailure('')
    resolveSource(parsed).then(
      (full) => {
        music.load(full)
        onDone()
      },
      (e: Error) => setFailure(e.message),
    )
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
        <span className="picker-field">
          <input
            autoFocus
            value={text}
            aria-label="Paste a YouTube or SoundCloud link"
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value)
              setFailure('')
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text')
              if (!parseMusic(pasted)) return
              e.preventDefault()
              setText(pasted)
              load(pasted)
            }}
            onKeyDown={onKeyDown}
          />
          {!text && (
            <span className="picker-placeholder" aria-hidden>
              Paste a <Brands /> link
            </span>
          )}
        </span>
        {source && <kbd>⏎</kbd>}
      </div>
      {(invalid || failure) && <p className="picker-error">{failure || 'That doesn’t look like a YouTube or SoundCloud link'}</p>}

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
          In YouTube Music or SoundCloud open a playlist, album, artist or song → <b>Share</b> → <b>Copy link</b>.
        </li>
        <li>
          Press <kbd>⌘V</kbd> anywhere in homegym. Your recent links stay here.
        </li>
        <li>Signed in to YouTube in this browser? Premium carries over, so no ads.</li>
      </ol>
    </div>
  )
}
