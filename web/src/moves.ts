import { ALIASES, MOVES, type MoveId } from './catalog'
import type { Move } from './figure'
import { fold } from './routine'
import type { Run } from './timer'

export { MOVES, type MoveId }

const SIDES: Record<string, 'left' | 'right'> = { left: 'left', right: 'right', stanga: 'left', dreapta: 'right' }

const singular = (word: string) =>
  /(ch|sh|x|ss)es$/.test(word) ? word.slice(0, -2) : word.length > 2 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word

/** Reduce an exercise name to its matching key and the side it names, if any. */
export function moveKey(label: string): { key: string; side: 'left' | 'right' | null } {
  const words = fold(label)
    .trim()
    .replace(/['’]/g, '')
    .replace(/^\d+\s*(?:x|×|reps?)\s+/, '')
    .replace(/\s+(?:(?:x|×)\s*\d+|\d+\s*reps?)$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  let side: 'left' | 'right' | null = null
  if (words.length > 1 && SIDES[words.at(-1)!]) side = SIDES[words.pop()!]
  else if (words.length > 1 && SIDES[words[0]]) side = SIDES[words.shift()!]
  return { key: words.map(singular).join(' '), side }
}

const INDEX = new Map<string, MoveId>()
for (const [id, move] of Object.entries(MOVES) as [MoveId, Move][])
  for (const name of [move.name, ...(ALIASES[id] ?? [])]) INDEX.set(moveKey(name).key, id)

/** Every name that leads to a demo, for tests. */
export const allNames = () => (Object.entries(MOVES) as [MoveId, Move][]).flatMap(([id, move]) => [move.name, ...(ALIASES[id] ?? [])].map((name) => ({ id, name })))

/** Demo names offered as builder suggestions. */
export const CATALOG = (Object.values(MOVES) as Move[]).map((move) => move.name)

export type Demo = { id: MoveId; move: Move; mirror: boolean }

const found = new Map<string, Demo | null>()

/** The demo for an exercise name: exact match on a known name only, never a guess. */
export function moveFor(label: string): Demo | null {
  if (found.has(label)) return found.get(label)!
  const { key, side } = moveKey(label)
  const id = INDEX.get(key)
  const move: Move | undefined = id && MOVES[id]
  const demo = id && move ? { id, move, mirror: side !== null && side !== (move.side ?? 'right') } : null
  found.set(label, demo)
  return demo
}

/** The step to demonstrate now: the current exercise, or during a rest the next one; null when finished. */
export function demoStep(run: Run) {
  if (run.finishedAt) return null
  const step = run.steps[run.index]
  return step.rest ? (run.steps.slice(run.index + 1).find((s) => !s.rest) ?? null) : step
}
