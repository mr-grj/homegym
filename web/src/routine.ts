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

export type Draft = Pick<Step, 'label' | 'note' | 'seconds' | 'rest'>

const UNITS: Record<string, number> = { h: 3600, hr: 3600, m: 60, min: 60, s: 1, sec: 1 }
const UNIT_TOKEN = /(\d+(?:[.,]\d+)?)(hr|h|min|m|sec|s)/gi
const BARE = /^\d+(?:[.,]\d+)?$/
const REPEAT = /(?:^|\s+)[×x*]\s*(\d+)$/i
const SEPARATOR = /^·\s*|\s*·$/g

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
  const clean = (part: string[]) => part.join(' ').replace(SEPARATOR, '')
  if (tail.count) return { label: clean(words.slice(0, -tail.count)), seconds: tail.total }
  const head = consume(words, bareMinutes)
  if (head.count) return { label: clean(words.slice(head.count)), seconds: head.total }
  return { label: clean(words), seconds: null }
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

/** One step as written in the source; `label` stays empty when none was given. */
export type DocStep = Draft & { line: number }

/** A block as written in the source, before rounds are expanded. */
export type DocBlock = { name: string; rounds: number; steps: DocStep[]; implicit: boolean }

/** The routine's structure as written, the shared model of the text and the builder. */
export type Doc = { title: string; blocks: DocBlock[] }

/** Parse routine text into its written structure, keeping empty blocks and blank labels. */
export function parseDoc(source: string): Doc {
  let title = ''
  const blocks: DocBlock[] = []
  source.split('\n').forEach((raw, line) => {
    const text = raw.trim()
    const current = blocks.at(-1)
    if (!text) return
    if (text.startsWith('##')) {
      const name = text.replace(/^#+/, '').trim()
      const repeat = name.match(REPEAT)
      blocks.push({
        name: repeat ? name.slice(0, repeat.index).trim() : name,
        rounds: repeat ? Math.max(1, Number(repeat[1])) : 1,
        steps: [],
        implicit: false,
      })
    } else if (text.startsWith('#')) {
      title ||= text.replace(/^#+/, '').trim()
    } else if (text.startsWith('>')) {
      const step = current?.steps.at(-1)
      if (step) step.note = [step.note, text.slice(1).trim()].filter(Boolean).join(' · ')
    } else {
      const rest = text.startsWith('~')
      const step = { ...splitDuration(rest ? text.slice(1) : text), note: '', rest, line }
      if (!current || (current.implicit && !rest)) blocks.push({ name: step.label, rounds: 1, steps: [step], implicit: true })
      else current.steps.push(step)
    }
  })
  return { title, blocks }
}

const stepLabel = (step: Draft) => step.label || (step.rest ? 'Rest' : 'Go')

/** Parse the plain-text routine format into blocks and a flat list of timed steps. */
export function parseRoutine(source: string, id: number | null = null): Routine {
  const doc = parseDoc(source)
  const used = doc.blocks
    .filter((block) => block.steps.length)
    .map((block, index) => ({
      ...block,
      name: block.name || (block.implicit ? stepLabel(block.steps[0]) : `Block ${index + 1}`),
      steps: block.steps.map(({ line, ...step }) => ({ ...step, label: stepLabel(step) })),
    }))
  return {
    id,
    title: doc.title || used[0]?.name || 'Untitled',
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

/** Write seconds the way people type them: 45s, 2m, 1h or 1:30. */
export function durationText(seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (seconds < 60) return `${seconds}s`
  if (!m && !s) return `${h}h`
  if (!h && !s) return `${m}m`
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Read a duration field: bare numbers are seconds, empty or "open" means no limit, undefined if unreadable. */
export function readDuration(text: string): number | null | undefined {
  const value = text.trim().toLowerCase()
  if (!value || value === 'open') return null
  if (BARE.test(value)) return Math.round(num(value)) || null
  const { label, seconds } = splitDuration(value)
  return label || seconds === null ? undefined : seconds || null
}

const tidy = (text: string) => text.trim().replace(/\s+/g, ' ')

/** True when a step would be written to the text; blank exercises without a duration are skipped. */
export const written = (step: Draft) => step.rest || !!tidy(step.label) || step.seconds !== null

function stepLine(step: Draft) {
  const label = tidy(step.label)
  const time = step.seconds === null ? '' : durationText(step.seconds)
  const shapes = (text: string) => (time ? [`${text} ${time}`.trim(), `${text} · ${time}`] : [text, `${text} ·`])
  const fits = (line: string) => {
    if (!step.rest && /^[#>~]/.test(line)) return false
    const read = splitDuration(line)
    return read.label === label && read.seconds === step.seconds
  }
  const options = [...shapes(label), ...shapes(`· ${label}`)]
  const line = options.find(fits) ?? options[0]
  return step.rest ? `~ ${line}`.trim() : line
}

function blockLine(block: Pick<DocBlock, 'name' | 'rounds'>) {
  const name = tidy(block.name)
  const rounds = block.rounds > 1 || REPEAT.test(name) ? `×${block.rounds}` : ''
  return ['##', name, rounds].filter(Boolean).join(' ')
}

/** Write a routine structure back to the plain-text format. */
export function serializeDoc(doc: { title: string; blocks: (Omit<DocBlock, 'steps'> & { steps: Draft[] })[] }): string {
  const parts: string[] = []
  const title = tidy(doc.title)
  if (title) parts.push(`# ${title}`)
  let bare = true
  for (const [index, block] of doc.blocks.entries()) {
    const steps = block.steps.filter(written)
    if (!steps.length && !tidy(block.name)) continue
    const [first, ...others] = steps
    bare &&=
      block.implicit &&
      block.rounds === 1 &&
      !!first &&
      (!first.rest || index === 0) &&
      tidy(block.name) === tidy(first.label) &&
      others.every((step) => step.rest)
    const lines = steps.flatMap((step) => [stepLine(step), ...(tidy(step.note) ? [`> ${tidy(step.note)}`] : [])])
    parts.push((bare ? lines : [blockLine(block), ...lines]).join('\n'))
  }
  return parts.join('\n\n') + '\n'
}

/** Steps used across routines, most used first, each with its most common duration and note. */
export function stepLibrary(sources: string[]): Draft[] {
  const seen = new Map<string, { uses: number; shapes: Map<string, { step: Draft; uses: number }> }>()
  for (const source of sources)
    for (const block of parseDoc(source).blocks)
      for (const { line, ...step } of block.steps) {
        const label = tidy(step.label)
        if (!label) continue
        const key = `${step.rest}|${fold(label)}`
        const entry = seen.get(key) ?? { uses: 0, shapes: new Map() }
        const shape = `${step.seconds}|${tidy(step.note)}`
        const known = entry.shapes.get(shape) ?? { step: { ...step, label, note: tidy(step.note) }, uses: 0 }
        known.uses++
        entry.uses++
        entry.shapes.set(shape, known)
        seen.set(key, entry)
      }
  return [...seen.values()]
    .sort((a, b) => b.uses - a.uses)
    .map((entry) => [...entry.shapes.values()].reduce((best, shape) => (shape.uses > best.uses ? shape : best)).step)
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

const timerKey = (text: string) => {
  const routine = quickRoutine(text)
  return routine ? `${routine.steps[0].seconds} ${fold(routine.title)}` : fold(text.trim())
}

/** Recent timer texts without repeats, newest first: `5m`, `5:00` and `300s` start the same timer. */
export const uniqueTimers = (list: string[]) => list.filter((text, i) => list.findIndex((other) => timerKey(other) === timerKey(text)) === i)

/** Return `title` if free, otherwise the first free "title copy", "title copy 2", and so on. */
export function uniqueTitle(title: string, taken: string[]): string {
  const used = new Set(taken.map((t) => fold(t.trim())))
  if (!used.has(fold(title.trim()))) return title
  const base = title.trim().replace(/ copy(?: \d+)?$/i, '')
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? `${base} copy` : `${base} copy ${n}`
    if (!used.has(fold(candidate))) return candidate
  }
}

/** Set the routine's `# title` line, adding one at the top when there is none. */
export function withTitle(source: string, title: string): string {
  const line = /^[ \t]*#(?!#).*$/m
  return line.test(source) ? source.replace(line, () => `# ${title}`) : `# ${title}\n\n${source}`
}
