/** Format seconds as m:ss or h:mm:ss. */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** Format seconds as a short human duration like "1h 25m" or "45s". */
export function human(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h) return m ? `${h}h ${m}m` : `${h}h`
  if (m) return s && m < 10 ? `${m}m ${s}s` : `${m}m`
  return `${s}s`
}

const apple = /Mac|iPhone|iPad/.test(navigator.userAgent)

/** Shortcut text for this device: ⌘, ⌥ and ⇧ read Ctrl, Alt and Shift off Apple devices. */
export const keyLabel = (keys: string) => (apple ? keys : keys.replace(/⌘/g, 'Ctrl+').replace(/⌥/g, 'Alt+').replace(/⇧/g, 'Shift+'))

/** Local calendar-day key for an ISO timestamp. */
export const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA')

/** Friendly day name: Today, Yesterday or a short date. */
export function dayLabel(key: string): string {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86_400_000)
  if (key === dayKey(today.toISOString())) return 'Today'
  if (key === dayKey(yesterday.toISOString())) return 'Yesterday'
  return new Date(`${key}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
