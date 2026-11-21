import type { Api, RoutineRecord, Session, SessionInput } from './api'
import { parseRoutine } from './routine'

type Data = { next: number; routines: RoutineRecord[]; sessions: Session[]; settings: Record<string, unknown> }

const KEY = 'homegym.demo'
const PLAYLIST = 'https://soundcloud.com/fitleague/sets/gym-motivation-workout-music'
const ORDER = ['full-body-20', 'core-10', 'tabata', 'mobility-morning', 'stretch-open-ended', 'breathing-4-7-8', 'deep-work', 'antrenament-full-body.ro']
const examples = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true })
const rank = (path: string) => {
  const index = ORDER.indexOf(path.split('/').pop()!.replace(/\.txt$/, ''))
  return index < 0 ? ORDER.length : index
}

function seed(): Data {
  const now = new Date().toISOString()
  const sources = Object.keys(examples)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((path) => examples[path])
  const routines = sources.map((source, i) => ({ id: i + 1, source, updated_at: now }))
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(hour, minute, 0, 0)
    return d
  }
  const logged = (id: number, source: string | undefined, start: Date, seconds: number, effort: number | null, notes = ''): Session => {
    const routine = source ? parseRoutine(source) : null
    return {
      id,
      title: routine?.title ?? 'Focus',
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + seconds * 1000).toISOString(),
      seconds,
      effort,
      notes,
      blocks: routine?.blocks.map((block) => ({ name: block.name, done: true })) ?? [],
    }
  }
  const sessions = [
    logged(1, sources[0], at(1, 7, 30), 1200, 7, 'Goblet squats felt easy. Go to 12 kg next time.'),
    logged(2, undefined, at(1, 10), 1500, null),
    logged(3, sources[1], at(3, 18, 15), 600, 6),
  ]
  const music = { recent: [{ url: PLAYLIST, kind: 'soundcloud', list: PLAYLIST, label: 'Gym Motivation & Workout Music' }] }
  return { next: 100, routines, sessions, settings: { 'homegym.recent': ['25m focus', '5m', '1:30'], 'homegym.music': music } }
}

let memory: Data | null = null

function load(): Data {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(KEY)
    memory = raw ? (JSON.parse(raw) as Data) : seed()
  } catch {
    memory = seed()
  }
  return memory
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory))
  } catch {}
}

const reply = <T>(value: T): Promise<T> => Promise.resolve(structuredClone(value))

function change<T>(mutate: (data: Data) => T): Promise<T> {
  try {
    const result = mutate(load())
    save()
    return reply(result)
  } catch (error) {
    return Promise.reject(error)
  }
}

function routineFor(source: string, id: number): RoutineRecord {
  if (!source || source.length > 50_000) throw new Error('422 Unprocessable Entity')
  return { id, source, updated_at: new Date().toISOString() }
}

/** The API, kept in this browser's localStorage and seeded with the example routines. */
export const demoApi: Api = {
  routines: () => reply(load().routines),
  createRoutine: (source: string) =>
    change((data) => {
      const routine = routineFor(source, data.next++)
      data.routines.push(routine)
      return routine
    }),
  updateRoutine: (id: number, source: string) =>
    change((data) => {
      const index = data.routines.findIndex((r) => r.id === id)
      if (index < 0) throw new Error('404 Not Found')
      data.routines[index] = routineFor(source, id)
      return data.routines[index]
    }),
  deleteRoutine: (id: number) =>
    change((data) => {
      data.routines = data.routines.filter((r) => r.id !== id)
    }),
  sessions: () => reply(load().sessions.toSorted((a, b) => b.started_at.localeCompare(a.started_at))),
  createSession: (session: SessionInput) =>
    change((data) => {
      const saved = { ...session, id: data.next++ }
      data.sessions.push(saved)
      return saved
    }),
  deleteSession: (id: number) =>
    change((data) => {
      data.sessions = data.sessions.filter((s) => s.id !== id)
    }),
  settings: () => reply(load().settings),
  putSetting: (key: string, value: unknown) =>
    change((data) => {
      data.settings[key] = value
    }),
  resolveLink: () => Promise.reject(new Error('Short links need the server')),
}
