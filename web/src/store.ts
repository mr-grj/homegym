import { useEffect, useRef, useState, type SetStateAction } from 'react'
import { api } from './api'

export const SYNCED = ['homegym.prefs', 'homegym.recent', 'homegym.music', 'homegym.music.collapsed'] as const
type SyncedKey = (typeof SYNCED)[number]

const listeners = new Map<string, Set<(value: unknown) => void>>()
const pending = new Map<string, unknown>()
const timers = new Map<string, number>()

/** Read a JSON value from localStorage, falling back when missing or unreadable. */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function push(key: string) {
  clearTimeout(timers.get(key))
  if (!pending.has(key)) return
  const value = pending.get(key)
  pending.delete(key)
  api.putSetting(key, value).catch(() => {
    if (!pending.has(key)) pending.set(key, value)
  })
}

/** Save a synced setting locally now and on the server shortly after. */
export function saveSetting(key: SyncedKey, value: unknown) {
  writeLocal(key, value)
  pending.set(key, value)
  clearTimeout(timers.get(key))
  timers.set(key, window.setTimeout(() => push(key), 1000))
}

/** Send unsaved settings immediately; survives the tab closing. */
export function flushSettings() {
  for (const [key, value] of pending) {
    clearTimeout(timers.get(key))
    void fetch(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    })
  }
  pending.clear()
}

/** Fetch server settings, apply them, and upload any this server has never seen. */
export async function pullSettings() {
  const remote = await api.settings()
  for (const key of SYNCED) {
    if (pending.has(key)) continue
    if (key in remote) {
      writeLocal(key, remote[key])
      listeners.get(key)?.forEach((listener) => listener(remote[key]))
    } else if (localStorage.getItem(key) !== null) {
      pending.set(key, readLocal(key, null))
      push(key)
    }
  }
}

/** Run `listener` whenever the server delivers a new value for `key`. */
export function onRemoteSetting(key: SyncedKey, listener: (value: unknown) => void) {
  const set = listeners.get(key) ?? new Set()
  set.add(listener)
  listeners.set(key, set)
  return () => void set.delete(listener)
}

function useStored<T>(key: string, initial: T, save: (value: T) => void) {
  const [value, setValue] = useState<T>(() => readLocal(key, initial))
  const latest = useRef(value)
  const update = (next: SetStateAction<T>) => {
    const resolved = next instanceof Function ? next(latest.current) : next
    latest.current = resolved
    setValue(resolved)
    save(resolved)
  }
  return { value, setValue, latest, update }
}

/** useState kept in sync with the server, cached locally for instant start. */
export function useSetting<T>(key: SyncedKey, initial: T) {
  const { value, setValue, latest, update } = useStored(key, initial, (v) => saveSetting(key, v))
  useEffect(
    () =>
      onRemoteSetting(key, (remote) => {
        latest.current = remote as T
        setValue(remote as T)
      }),
    [key],
  )
  return [value, update] as const
}

/** useState that survives reloads in this browser only. */
export function usePersistent<T>(key: string, initial: T) {
  const { value, update } = useStored(key, initial, (v) => writeLocal(key, v))
  return [value, update] as const
}
