import { useEffect } from 'react'

let audio: AudioContext | null = null

/** Create or resume the audio context; must run inside a user gesture. */
export function unlockAudio() {
  audio ??= new AudioContext()
  if (audio.state === 'suspended') void audio.resume()
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

/** Read text aloud, preferring a voice that matches `lang`. */
export function speak(text: string, lang?: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  if (lang) {
    utterance.lang = lang
    utterance.voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2))) ?? null
  }
  utterance.rate = 1.05
  speechSynthesis.speak(utterance)
}

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
