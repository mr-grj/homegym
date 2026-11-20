import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

type Call = { url: string; method: string; body: unknown; keepalive: boolean }

let calls: Call[]
let remote: Record<string, unknown>
let failPuts: boolean

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}

async function load() {
  vi.resetModules()
  return import('./store')
}

const flush = () => vi.advanceTimersByTimeAsync(0)
const puts = () => calls.filter((c) => c.method === 'PUT')

beforeEach(() => {
  calls = []
  remote = {}
  failPuts = false
  vi.useFakeTimers()
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined, keepalive: !!init.keepalive })
    if (method === 'PUT' && failPuts) throw new TypeError('offline')
    if (method === 'GET') return new Response(JSON.stringify(remote), { status: 200 })
    return new Response(null, { status: 204 })
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('synced settings', () => {
  test('save writes locally at once and to the server a second later, once', async () => {
    const { saveSetting, readLocal } = await load()
    saveSetting('homegym.recent', ['5m'])
    saveSetting('homegym.recent', ['25m', '5m'])
    expect(readLocal('homegym.recent', null)).toEqual(['25m', '5m'])
    await vi.advanceTimersByTimeAsync(999)
    expect(puts()).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(puts()).toEqual([{ url: '/api/settings/homegym.recent', method: 'PUT', body: ['25m', '5m'], keepalive: false }])
  })

  test('flush sends pending values right away and survives the tab closing', async () => {
    const { saveSetting, flushSettings } = await load()
    saveSetting('homegym.prefs', { sound: false })
    flushSettings()
    await flush()
    expect(puts()).toEqual([{ url: '/api/settings/homegym.prefs', method: 'PUT', body: { sound: false }, keepalive: true }])
    await vi.advanceTimersByTimeAsync(2000)
    expect(puts()).toHaveLength(1)
  })

  test('a failed save stays pending, so pulling does not overwrite it', async () => {
    const { saveSetting, pullSettings, readLocal } = await load()
    failPuts = true
    saveSetting('homegym.recent', ['new'])
    await vi.advanceTimersByTimeAsync(1000)
    remote = { 'homegym.recent': ['old'] }
    await pullSettings()
    expect(readLocal('homegym.recent', null)).toEqual(['new'])
  })

  test('pull applies server values and tells listeners', async () => {
    const { pullSettings, onRemoteSetting, readLocal } = await load()
    const heard: unknown[] = []
    onRemoteSetting('homegym.prefs', (value) => heard.push(value))
    remote = { 'homegym.prefs': { sound: true, voice: false, elapsed: true } }
    await pullSettings()
    expect(readLocal('homegym.prefs', null)).toEqual(remote['homegym.prefs'])
    expect(heard).toEqual([remote['homegym.prefs']])
  })

  test('pull uploads settings this server has never seen', async () => {
    localStorage.setItem('homegym.music.collapsed', 'true')
    const { pullSettings } = await load()
    await pullSettings()
    await flush()
    expect(puts()).toEqual([{ url: '/api/settings/homegym.music.collapsed', method: 'PUT', body: true, keepalive: false }])
  })
})
