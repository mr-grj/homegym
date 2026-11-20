import { useEffect, useSyncExternalStore } from 'react'

let audio: AudioContext | null = null

/** Create or resume the audio context and start loading voices; must run inside a user gesture. */
export function unlockAudio() {
  audio ??= new AudioContext()
  if (audio.state === 'suspended') void audio.resume()
  if ('speechSynthesis' in window) speechSynthesis.getVoices()
}

function tone(frequency: number, duration: number, delay = 0, volume = 0.22) {
  if (!audio) return
  const start = audio.currentTime + delay
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

export const cue = {
  tick: () => tone(880, 0.09),
  work: () => {
    tone(660, 0.14)
    tone(990, 0.34, 0.13)
  },
  rest: () => {
    tone(660, 0.16)
    tone(440, 0.34, 0.15)
  },
  done: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, i * 0.14)),
}

const NOVELTY =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|kathy|organ|pipe organ|princess|ralph|superstar|trinoids|whisper|wobble|zarvox)\b/i
const ROBOTIC = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b|espeak/i
const QUALITY: [RegExp, number, string][] = [
  [/natural|neural/i, 40, 'Natural'],
  [/premium/i, 36, 'Premium'],
  [/enhanced/i, 26, 'Enhanced'],
  [/^google\b/i, 20, 'Google'],
  [/\bonline\b/i, 15, 'Online'],
]

/** Score at or above which a voice sounds close to human. */
export const NATURAL = 20

const tag = (lang: string) => lang.replace(/_/g, '-').toLowerCase()

/** Base language of a BCP 47 tag, `en` when missing. */
export const baseLang = (lang?: string) => tag(lang || 'en').split('-')[0]

function region(lang?: string) {
  const base = baseLang(lang)
  const wanted = lang && tag(lang).includes('-') ? lang : navigator.languages?.find((l) => baseLang(l) === base)
  return wanted && tag(wanted).includes('-') ? tag(wanted) : base === 'en' ? 'en-us' : ''
}

/** How human a voice sounds, plus a short quality label. */
export function voiceQuality(voice: SpeechSynthesisVoice) {
  const id = `${voice.name} ${voice.voiceURI}`
  const match = QUALITY.find(([pattern]) => pattern.test(id))
  return { score: (match?.[1] ?? 0) - (ROBOTIC.test(voice.name) ? 20 : 0), label: match?.[2] ?? '' }
}

/** Voices for `lang`, best sounding first, without novelty voices. */
export function rankVoices(voices: readonly SpeechSynthesisVoice[], lang?: string) {
  const base = baseLang(lang)
  const local = region(lang)
  const score = (v: SpeechSynthesisVoice) => voiceQuality(v).score + (tag(v.lang) === local ? 5 : 0) + (v.default ? 3 : 0)
  return voices
    .filter((v) => baseLang(v.lang) === base && !NOVELTY.test(v.name))
    .map((v) => ({ v, s: score(v) }))
    .sort((a, b) => b.s - a.s)
    .map(({ v }) => v)
}

/** The saved voice for `lang` when this device has it, else the best sounding one. */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], lang?: string, preferred?: string) {
  const ranked = rankVoices(voices, lang)
  return ranked.find((v) => preferred && (v.name === preferred || v.voiceURI === preferred)) ?? ranked[0] ?? null
}

/** Short display name: `Microsoft Aria Online (Natural) - English (United States)` becomes `Aria`. */
export const voiceName = (voice: SpeechSynthesisVoice) =>
  voice.name
    .replace(/^Microsoft\s+/, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s*\((natural|premium|enhanced)\)/gi, '')
    .replace(/\s+Online$/, '')
    .trim() || voice.name

const FAILED = new Set(['network', 'synthesis-failed', 'synthesis-unavailable', 'voice-unavailable'])

/** Read text aloud with the saved or best voice for `lang`, falling back to an offline voice. */
export function speak(text: string, lang?: string, preferred?: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const say = (voice: SpeechSynthesisVoice | null, retry: boolean) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = voice?.lang.replace(/_/g, '-') ?? lang ?? 'en'
    utterance.voice = voice
    utterance.rate = 1.05
    utterance.onerror = (e) => {
      if (!retry || !voice || voice.localService || !FAILED.has(e.error)) return
      say(rankVoices(speechSynthesis.getVoices(), lang).find((v) => v.localService) ?? null, false)
    }
    speechSynthesis.speak(utterance)
  }
  say(pickVoice(speechSynthesis.getVoices(), lang, preferred), true)
}

let voiceList: readonly SpeechSynthesisVoice[] = []
const refreshVoices = () => (voiceList = speechSynthesis.getVoices())

function subscribeVoices(onChange: () => void) {
  if (!('speechSynthesis' in window)) return () => {}
  const handle = () => {
    refreshVoices()
    onChange()
  }
  speechSynthesis.addEventListener('voiceschanged', handle)
  handle()
  return () => speechSynthesis.removeEventListener('voiceschanged', handle)
}

/** The voices this browser offers; updates when they finish loading. */
export const useVoices = () => useSyncExternalStore(subscribeVoices, () => voiceList)

/** Buzz the device when supported. */
export const vibrate = (pattern: number[]) => navigator.vibrate?.(pattern)

/** Keep the screen awake while `active`. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let alive = true
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => (alive ? (lock = sentinel) : void sentinel.release()))
        .catch(() => {})
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
