import { NATURAL, baseLang, pickVoice, rankVoices, speak, useVoices, voiceName, voiceQuality } from '../sound'
import { Icon } from './Icon'
import { tip } from './Tooltips'

const samples: Record<string, string> = {
  en: 'Goblet squat. Next: Push-ups',
  ro: 'Genuflexiuni. Urmează: Flotări',
}

const languageName = (lang: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(baseLang(lang)) ?? lang
  } catch {
    return lang
  }
}

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
  langs,
  chosen,
  onToggle,
  onChoose,
}: {
  on: boolean
  langs: string[]
  chosen: Record<string, string>
  onToggle: () => void
  onChoose: (lang: string, name: string | null) => void
}) {
  const voices = useVoices()
  const supported = 'speechSynthesis' in window
  const best = Math.max(-1, ...langs.map((lang) => rankVoices(voices, lang)[0]).filter(Boolean).map((v) => voiceQuality(v).score))

  const choose = (lang: string, name: string | null) => {
    const base = baseLang(lang)
    onChoose(base, name)
    speak(samples[base] ?? samples.en, lang, name ?? undefined)
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
          <small>Says the exercise as it starts and what comes next during rests. Press V to switch it anytime.</small>
        </span>
      </label>

      {!supported && <p className="picker-error">This browser can’t read aloud.</p>}

      {supported &&
        langs.map((lang) => {
          const base = baseLang(lang)
          const ranked = rankVoices(voices, lang)
          const auto = pickVoice(voices, lang)
          const current = chosen[base] && ranked.some((v) => v.name === chosen[base]) ? chosen[base] : null
          return (
            <section key={base} className="voice-lang">
              {langs.length > 1 && <h4>{languageName(lang)}</h4>}
              {ranked.length === 0 ? (
                <p className="voice-none">No {languageName(lang)} voice on this device. The browser’s default voice reads it.</p>
              ) : (
                <ul className="recent-music voice-list">
                  <li data-active={!current || undefined}>
                    <button className="grow" onClick={() => choose(lang, null)} {...tip('Use the best voice this device has and hear it')}>
                      <Icon name="voice" />
                      <span>Automatic</span>
                      <small>{auto && [voiceName(auto), voiceQuality(auto).label].filter(Boolean).join(' · ')}</small>
                    </button>
                  </li>
                  {ranked.map((v) => (
                    <li key={v.voiceURI || v.name} data-active={current === v.name || undefined}>
                      <button className="grow" onClick={() => choose(lang, v.name)} {...tip(`Use ${voiceName(v)} and hear it`)}>
                        <Icon name="play" />
                        <span>{voiceName(v)}</span>
                        <small>{[voiceQuality(v).label, v.lang.replace(/_/g, '-').split('-')[1]?.toUpperCase()].filter(Boolean).join(' · ')}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}

      {supported && (
        <p className="howto voice-hint">
          {best < NATURAL ? <>Sounds robotic? {upgradeHint()}</> : 'Voices come from this device, so each device keeps its own pick.'}
        </p>
      )}
    </div>
  )
}
