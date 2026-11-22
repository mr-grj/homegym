import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { CATALOG, moveFor } from '../moves'
import { durationText, fold, readDuration, type Doc, type DocBlock, type DocStep, type Draft } from '../routine'
import { Icon } from './Icon'
import { tip } from './Tooltips'

type Step = Omit<DocStep, 'line'> & { id: number }
type Block = Omit<DocBlock, 'steps'> & { id: number; steps: Step[] }
export type Plan = { title: string; blocks: Block[] }
export type Change = { key?: string; removed?: string }

let lastId = 0
const nextId = () => ++lastId
const newBlock = (): Block => ({ id: nextId(), name: '', rounds: 1, implicit: false, steps: [] })

/** Give each block and step of a parsed routine a stable id for editing. */
export const toPlan = (doc: Doc): Plan => ({
  title: doc.title,
  blocks: doc.blocks.map((block) => ({ ...block, id: nextId(), steps: block.steps.map(({ line, ...step }) => ({ ...step, id: nextId() })) })),
})

/** An empty routine with one unnamed block, the starting point of a new routine. */
export const blankPlan = (): Plan => ({ title: '', blocks: [newBlock()] })

const PRESETS = [10, 15, 20, 30, 45, 60, 90, 120, 180, 300]
const SUGGESTIONS = 8

function place(blocks: Block[], stepId: number, blockId: number, beforeId: number | null) {
  const step = blocks.flatMap((block) => block.steps).find((s) => s.id === stepId)!
  return blocks.map((block) => {
    const steps = block.steps.filter((s) => s.id !== stepId)
    if (block.id === blockId) {
      const at = beforeId === null ? -1 : steps.findIndex((s) => s.id === beforeId)
      steps.splice(at < 0 ? steps.length : at, 0, step)
    } else if (steps.length === block.steps.length) return block
    return { ...block, steps, implicit: false }
  })
}

function nudge(seconds: number | null, up: boolean) {
  if (seconds === null) return up ? 30 : null
  const by = (up ? seconds < 60 : seconds <= 60) ? 5 : (up ? seconds < 300 : seconds <= 300) ? 15 : 60
  return Math.max(5, seconds + (up ? by : -by))
}

function Duration({ seconds, onChange }: { seconds: number | null; onChange: (seconds: number | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const shown = draft ?? (seconds === null ? '' : durationText(seconds))
  const set = (next: number | null) => {
    onChange(next)
    setDraft(next === null ? '' : durationText(next))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.altKey || e.metaKey || e.ctrlKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    set(nudge(seconds, e.key === 'ArrowUp'))
  }

  return (
    <>
      <input
        ref={input}
        className="b-time num"
        value={shown}
        placeholder="open"
        aria-label="Duration"
        autoComplete="off"
        data-invalid={(draft !== null && readDuration(draft) === undefined) || undefined}
        onFocus={(e) => {
          setDraft(shown)
          e.target.select()
        }}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value)
          const value = readDuration(e.target.value)
          if (value !== undefined) onChange(value)
        }}
        onKeyDown={onKeyDown}
      />
      {draft !== null && (
        <div className="b-presets">
          {[...PRESETS, null].map((preset) => (
            <button
              key={preset ?? 'open'}
              tabIndex={-1}
              data-on={preset === seconds || undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                set(preset)
                input.current?.blur()
              }}
            >
              {preset === null ? 'open' : durationText(preset)}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

type Props = { plan: Plan; library: Draft[]; autoFocus: boolean; onChange: (plan: Plan, change?: Change) => void }

export function Builder({ plan, library, autoFocus, onChange }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const latest = useRef(plan)
  const emit = useRef(onChange)
  const focusNext = useRef<string | null>(null)
  const keepFocus = useRef<Element | null>(null)
  const drag = useRef<{ kind: 'step' | 'block'; id: number; x: number; y: number; key: string } | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  latest.current = plan
  emit.current = onChange

  const known = useMemo(() => new Map(library.map((step) => [`${step.rest}|${fold(step.label)}`, step])), [library])
  const [query, setQuery] = useState('')
  const names = useMemo(() => {
    const work = library.filter((s) => !s.rest).map((s) => s.label)
    const used = new Set(work.map(fold))
    return [...work, ...CATALOG.filter((name) => !used.has(fold(name)))]
  }, [library])
  const suggestions = useMemo(() => {
    const typed = fold(query.trim())
    if (!typed) return names.slice(0, SUGGESTIONS)
    const starts = names.filter((name) => fold(name).startsWith(typed))
    const inside = names.filter((name) => !fold(name).startsWith(typed) && fold(name).includes(typed))
    return [...starts, ...inside].slice(0, SUGGESTIONS)
  }, [names, query])

  useLayoutEffect(() => {
    if (focusNext.current) {
      const el = root.current?.querySelector<HTMLInputElement>(focusNext.current)
      el?.focus()
      el?.setSelectionRange(el.value.length, el.value.length)
      el?.scrollIntoView({ block: 'nearest' })
      focusNext.current = null
    }
    if (keepFocus.current instanceof HTMLElement && document.activeElement !== keepFocus.current) keepFocus.current.focus()
    keepFocus.current = null
  })

  const commit = (blocks: Block[], change?: Change) => emit.current({ ...latest.current, blocks }, change)
  const focusLabel = (id: number) => (focusNext.current = `[data-step="${id}"] .b-label`)
  const focusName = (id: number) => (focusNext.current = `[data-block="${id}"] .b-name`)

  const defaultSeconds = (rest: boolean, blockId: number, afterId?: number) => {
    const all = plan.blocks.flatMap((block) => block.steps)
    const index = plan.blocks.findIndex((block) => block.id === blockId)
    const end = afterId ?? plan.blocks.slice(0, index + 1).flatMap((block) => block.steps).at(-1)?.id
    const like = (step: Step) => step.rest === rest
    const found = all.slice(0, all.findIndex((step) => step.id === end) + 1).findLast(like) ?? all.find(like)
    return found ? found.seconds : rest ? 15 : 45
  }

  const editBlock = (id: number, patch: Partial<Block>, key?: string) =>
    commit(plan.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)), { key })

  const editStep = (id: number, patch: Partial<Step>, key?: string) =>
    commit(
      plan.blocks.map((block) => {
        if (!block.steps.some((step) => step.id === id)) return block
        const steps = block.steps.map((step) => (step.id === id ? { ...step, ...patch } : step))
        const named = block.implicit && block.steps[0].id === id && patch.label !== undefined
        return { ...block, steps, name: named ? patch.label! : block.name }
      }),
      { key },
    )

  const addStep = (blockId: number, rest: boolean, afterId?: number) => {
    const step: Step = { id: nextId(), label: '', note: '', seconds: defaultSeconds(rest, blockId, afterId), rest }
    focusLabel(step.id)
    commit(
      plan.blocks.map((block) => {
        if (block.id !== blockId) return block
        const at = afterId === undefined ? block.steps.length : block.steps.findIndex((s) => s.id === afterId) + 1
        return { ...block, implicit: false, steps: block.steps.toSpliced(at, 0, step) }
      }),
    )
  }

  const removeStep = (id: number, toast = true) => {
    const order = plan.blocks.flatMap((block) => block.steps.map((step) => ({ step, block })))
    const at = order.findIndex((entry) => entry.step.id === id)
    const { step, block } = order[at]
    const previous = order[at - 1]
    if (previous?.block.id === block.id) focusLabel(previous.step.id)
    else focusName(block.id)
    const label = step.label.trim() || (step.rest ? 'Rest' : '')
    commit(
      plan.blocks.map((b) => (b.id === block.id ? { ...b, steps: b.steps.filter((s) => s.id !== id) } : b)),
      toast && label ? { removed: label } : undefined,
    )
  }

  const addBlock = (afterId?: number, copy?: Block) => {
    const block = copy ? { ...copy, id: nextId(), implicit: false, steps: copy.steps.map((step) => ({ ...step, id: nextId() })) } : newBlock()
    const at = afterId === undefined ? plan.blocks.length : plan.blocks.findIndex((b) => b.id === afterId) + 1
    focusName(block.id)
    commit(plan.blocks.toSpliced(at, 0, block))
  }

  const removeBlock = (id: number, index: number) => {
    const block = plan.blocks[index]
    const neighbour = plan.blocks[index + 1] ?? plan.blocks[index - 1]
    if (neighbour) focusName(neighbour.id)
    else focusNext.current = '.b-title'
    commit(
      plan.blocks.filter((b) => b.id !== id),
      { removed: block.name.trim() || `Block ${index + 1}` },
    )
  }

  const moveStep = (id: number, up: boolean) => {
    const b = plan.blocks.findIndex((block) => block.steps.some((step) => step.id === id))
    const steps = plan.blocks[b].steps
    const s = steps.findIndex((step) => step.id === id)
    let block: Block | undefined = plan.blocks[b]
    let before: number | null
    if (up && s > 0) before = steps[s - 1].id
    else if (!up && s < steps.length - 1) before = steps[s + 2]?.id ?? null
    else {
      block = plan.blocks[b + (up ? -1 : 1)]
      if (!block) return
      before = up ? null : (block.steps[0]?.id ?? null)
    }
    keepFocus.current = document.activeElement
    commit(place(plan.blocks, id, block.id, before))
  }

  const moveBlock = (index: number, up: boolean) => {
    const to = index + (up ? -1 : 1)
    if (to < 0 || to >= plan.blocks.length) return
    keepFocus.current = document.activeElement
    commit(plan.blocks.toSpliced(index, 1).toSpliced(to, 0, plan.blocks[index]))
  }

  const onArrows = (move: (up: boolean) => void) => (e: KeyboardEvent) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    e.stopPropagation()
    move(e.key === 'ArrowUp')
  }

  const hover = () => {
    const d = drag.current
    if (!d) return
    const blocks = latest.current.blocks
    const hit = document.elementFromPoint(d.x, d.y)
    const card = hit?.closest<HTMLElement>('[data-block]')
    if (!card) return
    const cardId = Number(card.dataset.block)
    const below = (el: Element) => {
      const r = el.getBoundingClientRect()
      return d.y > r.top + r.height / 2
    }
    if (d.kind === 'block') {
      const from = blocks.findIndex((b) => b.id === d.id)
      const to = blocks.findIndex((b) => b.id === cardId)
      if (to !== from && (from < to) === below(card)) commit(blocks.toSpliced(from, 1).toSpliced(to, 0, blocks[from]), { key: d.key })
      return
    }
    const block = blocks.find((b) => b.id === cardId)!
    const row = hit?.closest<HTMLElement>('[data-step]')
    const rowId = Number(row?.dataset.step)
    if (row && rowId === d.id) return
    let before: number | null
    if (row) {
      const order = blocks.flatMap((b) => b.steps.map((s) => s.id))
      const down = order.indexOf(d.id) < order.indexOf(rowId)
      if (down !== below(row)) return
      const rest = block.steps.filter((s) => s.id !== d.id)
      before = down ? (rest[rest.findIndex((s) => s.id === rowId) + 1]?.id ?? null) : rowId
    } else if (hit?.closest('header')) before = block.steps.find((s) => s.id !== d.id)?.id ?? null
    else if (hit?.closest('footer')) before = null
    else return
    const current = block.steps.findIndex((s) => s.id === d.id)
    const nextAfter = block.steps.find((s, i) => i > current && s.id !== d.id)?.id ?? null
    if (current >= 0 && nextAfter === before) return
    commit(place(blocks, d.id, block.id, before), { key: d.key })
  }

  const startDrag = (kind: 'step' | 'block', id: number) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const grip = `[data-${kind}="${id}"] .b-grip`
    root.current?.querySelector<HTMLElement>(grip)?.focus({ preventScroll: true })
    drag.current = { kind, id, x: e.clientX, y: e.clientY, key: `drag${id}.${Date.now()}` }
    setDragging(id)
    let frame = 0
    const scroll = () => {
      const d = drag.current
      const el = root.current
      if (!d || !el) return
      const box = el.scrollHeight > el.clientHeight + 1 ? el : el.closest('.sheet')
      if (box) {
        const r = box.getBoundingClientRect()
        const by = d.y < r.top + 48 ? d.y - r.top - 48 : d.y > r.bottom - 48 ? d.y - r.bottom + 48 : 0
        if (by) {
          box.scrollTop += Math.max(-16, Math.min(16, by / 3))
          hover()
        }
      }
      frame = requestAnimationFrame(scroll)
    }
    const onMove = (ev: PointerEvent) => {
      if (!drag.current) return
      drag.current.x = ev.clientX
      drag.current.y = ev.clientY
      hover()
    }
    const end = () => {
      cancelAnimationFrame(frame)
      drag.current = null
      setDragging(null)
      root.current?.querySelector<HTMLElement>(grip)?.focus({ preventScroll: true })
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    frame = requestAnimationFrame(scroll)
  }

  const pick = (step: Step, label: string, inputType?: string) => {
    const match = !inputType || inputType === 'insertReplacementText' ? known.get(`${step.rest}|${fold(label)}`) : undefined
    if (!match || match.label !== label) return editStep(step.id, { label }, `label${step.id}`)
    editStep(step.id, { label, seconds: match.seconds, note: step.note || match.note })
  }

  return (
    <div className="builder" ref={root} data-dragging={dragging !== null || undefined}>
      <datalist id="known-work">
        {suggestions.map((label) => <option key={label} value={label} />)}
      </datalist>
      <datalist id="known-rest">
        {library.filter((s) => s.rest).map((s) => <option key={s.label} value={s.label} />)}
      </datalist>
      <input
        className="b-title"
        value={plan.title}
        placeholder="Routine name"
        aria-label="Routine name"
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(e) => onChange({ ...plan, title: e.target.value }, { key: 'title' })}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.metaKey || e.ctrlKey) return
          e.preventDefault()
          if (plan.blocks[0]) root.current?.querySelector<HTMLInputElement>('.b-name')?.focus()
          else addBlock()
        }}
      />
      {plan.blocks.map((block, b) => (
        <section key={block.id} className="b-block" data-block={block.id} data-dragging={dragging === block.id || undefined}>
          <header onKeyDown={onArrows((up) => moveBlock(b, up))}>
            <button className="b-grip" onPointerDown={startDrag('block', block.id)} {...tip('Drag to move this block', '⌥↑↓')}>
              <Icon name="grip" />
            </button>
            <input
              className="b-name"
              value={block.name}
              placeholder={`Block ${b + 1}`}
              aria-label="Block name"
              autoComplete="off"
              onChange={(e) => editBlock(block.id, { name: e.target.value, implicit: false }, `name${block.id}`)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.metaKey || e.ctrlKey) return
                e.preventDefault()
                if (block.steps[0]) root.current?.querySelector<HTMLInputElement>(`[data-step="${block.steps[0].id}"] .b-label`)?.focus()
                else addStep(block.id, false)
              }}
            />
            <span className="b-rounds">
              <button
                disabled={block.rounds <= 1}
                onClick={() => editBlock(block.id, { rounds: block.rounds - 1 })}
                {...tip('One round fewer')}
              >
                <Icon name="minus" />
              </button>
              <span className="num" data-on={block.rounds > 1 || undefined}>
                ×{block.rounds}
              </span>
              <button disabled={block.rounds >= 99} onClick={() => editBlock(block.id, { rounds: block.rounds + 1 })} {...tip('One more round')}>
                <Icon name="plus" />
              </button>
            </span>
            <button className="b-icon" onClick={() => addBlock(block.id, block)} {...tip('Duplicate this block')}>
              <Icon name="copy" />
            </button>
            <button className="b-icon" onClick={() => removeBlock(block.id, b)} {...tip('Remove this block (you can undo)')}>
              <Icon name="close" />
            </button>
          </header>
          <ol>
            {block.steps.map((step) => {
              const demo = step.rest ? null : moveFor(step.label)
              return (
                <li
                  key={step.id}
                  className="b-step"
                  data-step={step.id}
                  data-rest={step.rest || undefined}
                  data-demo={demo?.id}
                  data-dragging={dragging === step.id || undefined}
                  onKeyDown={onArrows((up) => moveStep(step.id, up))}
                >
                  <button className="b-grip" onPointerDown={startDrag('step', step.id)} {...tip('Drag to move', '⌥↑↓')}>
                    <Icon name="grip" />
                  </button>
                  <button
                    className="b-kind"
                    onClick={() => editStep(step.id, { rest: !step.rest })}
                    {...tip(step.rest ? 'Rest. Make it an exercise' : 'Exercise. Make it a rest')}
                  />
                  <input
                    className="b-label"
                    value={step.label}
                    placeholder={step.rest ? 'Rest' : 'Exercise'}
                    aria-label={step.rest ? 'Rest name' : 'Exercise name'}
                    list={step.rest ? 'known-rest' : 'known-work'}
                    autoComplete="off"
                    enterKeyHint="next"
                    onFocus={() => setQuery(step.rest ? '' : step.label)}
                    onChange={(e) => {
                      if (!step.rest) setQuery(e.target.value)
                      pick(step, e.target.value, (e.nativeEvent as InputEvent).inputType)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                        e.preventDefault()
                        addStep(block.id, false, step.id)
                      } else if (e.key === 'Backspace' && !step.label && !step.note) {
                        e.preventDefault()
                        removeStep(step.id, false)
                      }
                    }}
                  />
                  {demo && (
                    <span className="b-demo" {...tip(`Shows a demo during the workout: ${demo.move.name}`)}>
                      <Icon name="figure" />
                    </span>
                  )}
                  <Duration seconds={step.seconds} onChange={(seconds) => editStep(step.id, { seconds }, `time${step.id}`)} />
                  <button className="b-icon" onClick={() => removeStep(step.id)} {...tip('Remove (you can undo)')}>
                    <Icon name="close" />
                  </button>
                  <input
                    className="b-note"
                    value={step.note}
                    placeholder="Add a note: reps, weight, cues"
                    aria-label="Note"
                    autoComplete="off"
                    enterKeyHint="next"
                    onChange={(e) => editStep(step.id, { note: e.target.value }, `note${step.id}`)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey) return
                      e.preventDefault()
                      addStep(block.id, false, step.id)
                    }}
                  />
                </li>
              )
            })}
          </ol>
          <footer>
            <button onClick={() => addStep(block.id, false)} {...tip('Add an exercise to this block', '⏎')}>
              <Icon name="plus" /> Exercise
            </button>
            <button data-rest onClick={() => addStep(block.id, true)} {...tip('Add a rest to this block')}>
              <Icon name="plus" /> Rest
            </button>
          </footer>
        </section>
      ))}
      <button className="b-add" onClick={() => addBlock()} {...tip('Add a block. Blocks can repeat')}>
        <Icon name="plus" /> Block
      </button>
    </div>
  )
}
