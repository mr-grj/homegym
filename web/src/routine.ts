export type Step = {
  label: string
  note: string
  seconds: number | null
  rest: boolean
  block: number
  round: number
  rounds: number
}

export type Routine = {
  id: number | null
  title: string
  lang?: string
  quick: boolean
  blocks: { name: string; seconds: number | null }[]
  steps: Step[]
}

type Draft = Pick<Step, 'label' | 'note' | 'seconds' | 'rest'>

const UNITS: Record<string, number> = { h: 3600, hr: 3600, m: 60, min: 60, s: 1, sec: 1 }
const UNIT_TOKEN = /(\d+(?:[.,]\d+)?)(hr|h|min|m|sec|s)/gi
const BARE = /^\d+(?:[.,]\d+)?$/

const num = (value: string) => parseFloat(value.replace(',', '.'))

function tokenSeconds(token: string, bareMinutes: boolean): number | null {
  const clock = token.match(/^(\d+):(\d{2})(?::(\d{2}))?$/)
  if (clock) {
    const [a, b, c] = clock.slice(1).map(Number)
    return clock[3] === undefined ? a * 60 + b : a * 3600 + b * 60 + c
  }
  if (BARE.test(token)) return bareMinutes ? Math.round(num(token) * 60) : null
  const parts = [...token.matchAll(UNIT_TOKEN)]
  if (!parts.length || parts.map((p) => p[0]).join('') !== token) return null
  return Math.round(parts.reduce((sum, [, value, unit]) => sum + num(value) * UNITS[unit.toLowerCase()], 0))
}

function consume(words: string[], bareMinutes: boolean) {
  let total = 0
  let count = 0
  for (const word of words) {
    const seconds = tokenSeconds(word, bareMinutes)
    if (seconds === null || (BARE.test(word) && count)) break
    total += seconds
    count++
    if (BARE.test(word)) break
  }
  return { total, count }
}

/** Split "Goblet squat 45s" or "5m plank" into a label and a duration in seconds. */
export function splitDuration(text: string, bareMinutes = false) {
  const words = text
    .replace(/(\d)\s+(hr|h|min|m|sec|s)\b/gi, '$1$2')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const tail = consume([...words].reverse(), bareMinutes)
  if (tail.count) return { label: words.slice(0, -tail.count).join(' '), seconds: tail.total }
  const head = consume(words, bareMinutes)
  if (head.count) return { label: words.slice(head.count).join(' '), seconds: head.total }
  return { label: words.join(' '), seconds: null }
}

/** Sum step durations, or null when any step is open-ended. */
export function totalSeconds(steps: Pick<Step, 'seconds'>[]): number | null {
  let total = 0
  for (const step of steps) {
    if (step.seconds === null) return null
    total += step.seconds
  }
  return total
}

/** Parse the plain-text routine format into blocks and a flat list of timed steps. */
export function parseRoutine(source: string, id: number | null = null): Routine {
  let title = ''
  const blocks: { name: string; rounds: number; steps: Draft[]; implicit: boolean }[] = []
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    const current = blocks.at(-1)
    if (!line) continue
    if (line.startsWith('##')) {
      const name = line.replace(/^#+/, '').trim()
      const repeat = name.match(/\s+[×x*]\s*(\d+)$/i)
      blocks.push({
        name: repeat ? name.slice(0, repeat.index).trim() : name,
        rounds: repeat ? Math.max(1, Number(repeat[1])) : 1,
        steps: [],
        implicit: false,
      })
    } else if (line.startsWith('#')) {
      title ||= line.replace(/^#+/, '').trim()
    } else if (line.startsWith('>')) {
      const step = current?.steps.at(-1)
      if (step) step.note = [step.note, line.slice(1).trim()].filter(Boolean).join(' · ')
    } else {
      const rest = line.startsWith('~')
      const { label, seconds } = splitDuration(rest ? line.slice(1) : line)
      const step = { label: label || (rest ? 'Rest' : 'Go'), note: '', seconds, rest }
      if (!current || (current.implicit && !rest)) blocks.push({ name: step.label, rounds: 1, steps: [step], implicit: true })
      else current.steps.push(step)
    }
  }
  const used = blocks.filter((block) => block.steps.length)
  return {
    id,
    title: title || used[0]?.name || 'Untitled',
    lang: /[ăâîșțşţ]/i.test(source) ? 'ro-RO' : undefined,
    quick: false,
    blocks: used.map((block) => {
      const once = totalSeconds(block.steps)
      return { name: block.name, seconds: once === null ? null : once * block.rounds }
    }),
    steps: used.flatMap((block, index) =>
      Array.from({ length: block.rounds }, (_, round) =>
        block.steps.map((step) => ({ ...step, block: index, round: round + 1, rounds: block.rounds })),
      ).flat(),
    ),
  }
}

/** Build a one-step timer from input like "25m", "1:30 plank" or "" (stopwatch); null if unparseable. */
export function quickRoutine(text: string): Routine | null {
  const { label, seconds } = splitDuration(text, true)
  if (text.trim() && !seconds) return null
  const name = label || (seconds ? 'Timer' : 'Stopwatch')
  return {
    id: null,
    title: name,
    quick: true,
    blocks: [{ name, seconds }],
    steps: [{ label: name, note: '', seconds, rest: false, block: 0, round: 1, rounds: 1 }],
  }
}

/** Fold case and diacritics for forgiving search. */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
