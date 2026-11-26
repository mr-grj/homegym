import { NATURAL, pickVoice, rankVoices, speak, useVoices, voiceName, voiceQuality } from '../sound'
import { Icon } from './Icon'
import { tip } from './Tooltips'

const SAMPLE = 'Rest. Up next: Goblet squat'

function upgradeHint() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|Macintosh/.test(ua))
    return (
      <>
        Download a <b>Premium</b> or <b>Enhanced</b> voice in <b>System Settings › Accessibility › Spoken Content › System voice › Manage Voices</b> (iPhone:{' '}
        <b>Settings › Accessibility › Spoken Content › Voices</b>), then reload.
      </>
    )
  if (/Android/.test(ua))
    return (
      <>
        Install a better voice in <b>Settings › Text-to-speech output</b>, or open homegym in <b>Edge</b>, which brings natural voices.
      </>
    )
  return (
    <>
      <b>Edge</b> has natural voices built in, and <b>Chrome</b> adds Google voices when online.
    </>
  )
}

export function VoicePicker({
  on,
  chosen,
  onToggle,
  onChoose,
}: {
  on: boolean
  chosen: string
  onToggle: () => void
  onChoose: (name: string) => void
}) {
  const voices = useVoices()
  const supported = 'speechSynthesis' in window
  const ranked = rankVoices(voices)
  const auto = pickVoice(voices)
  const current = chosen && ranked.some((v) => v.name === chosen) ? chosen : null

  const choose = (name: string) => {
    onChoose(name)
    speak(SAMPLE, name || undefined)
  }

  return (
    <div className="picker voice-picker">
      <header className="sheet-head">
        <h2>Voice</h2>
      </header>

      <label className="follow">
        <input type="checkbox" checked={on} onChange={onToggle} />
        <span>
          <b>Read each exercise aloud</b>
          <small>Names each exercise as it starts and what comes next during rests. Press V to switch it anytime.</small>
        </span>
      </label>

      {!supported && <p className="picker-error">This browser can’t read aloud.</p>}

      {supported &&
        (ranked.length === 0 ? (
          <p className="voice-none">No English voice on this device. The browser’s default voice reads it.</p>
        ) : (
          <ul className="recent-music voice-list">
            <li data-active={!current || undefined}>
              <button className="grow" onClick={() => choose('')} {...tip('Use the best voice this device has and hear it')}>
                <Icon name="voice" />
                <span>Automatic</span>
                <small>{auto && [voiceName(auto), voiceQuality(auto).label].filter(Boolean).join(' · ')}</small>
              </button>
            </li>
            {ranked.map((v) => (
              <li key={v.voiceURI || v.name} data-active={current === v.name || undefined}>
                <button className="grow" onClick={() => choose(v.name)} {...tip(`Use ${voiceName(v)} and hear it`)}>
                  <Icon name="play" />
                  <span>{voiceName(v)}</span>
                  <small>{[voiceQuality(v).label, v.lang.replace(/_/g, '-').split('-')[1]?.toUpperCase()].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {supported && (
        <p className="howto voice-hint">
          {(ranked[0] ? voiceQuality(ranked[0]).score : -1) < NATURAL ? <>Sounds robotic? {upgradeHint()}</> : 'Voices come from this device, so each device keeps its own pick.'}
        </p>
      )}
    </div>
  )
}
