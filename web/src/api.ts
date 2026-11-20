import { demoApi } from './demo'

export type RoutineRecord = { id: number; source: string; updated_at: string }
export type SessionBlock = { name: string; done: boolean }
export type SessionInput = {
  title: string
  started_at: string
  ended_at: string
  seconds: number
  effort: number | null
  notes: string
  blocks: SessionBlock[]
}
export type Session = SessionInput & { id: number }

async function request<T>(path: string, method = 'GET', body?: unknown, keepalive = false): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    keepalive,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.status === 204 ? (undefined as T) : res.json()
}

const server = {
  routines: () => request<RoutineRecord[]>('/routines'),
  createRoutine: (source: string) => request<RoutineRecord>('/routines', 'POST', { source }),
  updateRoutine: (id: number, source: string) => request<RoutineRecord>(`/routines/${id}`, 'PUT', { source }),
  deleteRoutine: (id: number) => request<void>(`/routines/${id}`, 'DELETE'),
  sessions: () => request<Session[]>('/sessions'),
  createSession: (session: SessionInput) => request<Session>('/sessions', 'POST', session),
  deleteSession: (id: number) => request<void>(`/sessions/${id}`, 'DELETE'),
  settings: () => request<Record<string, unknown>>('/settings'),
  putSetting: (key: string, value: unknown, keepalive = false) =>
    request<void>(`/settings/${encodeURIComponent(key)}`, 'PUT', value, keepalive),
  resolveLink: (url: string) => request<{ url: string }>(`/music/resolve?url=${encodeURIComponent(url)}`),
}

/** Every call the app makes; the demo build answers the same calls from the browser. */
export type Api = typeof server

/** The server API, or a browser-only copy in the GitHub Pages demo build. */
export const api: Api = import.meta.env.VITE_DEMO ? demoApi : server
