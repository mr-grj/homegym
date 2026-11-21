import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { keyLabel } from '../format'

type Tip = { text: string; key?: string; body?: ReactNode; x: number; top: number; bottom: number }

const bodies = new WeakMap<Element, ReactNode>()

/** Tooltip props for a button: visible hint, optional shortcut, accessible name, optional rich body shown instead of the hint. */
export const tip = (text: string, key?: string, body?: ReactNode) => ({
  'data-tip': text,
  'data-key': key && keyLabel(key),
  'aria-label': text,
  ...(body === undefined ? {} : { ref: (el: HTMLElement | null) => void (el && bodies.set(el, body)) }),
})

export function Tooltips() {
  const [current, setCurrent] = useState<Tip | null>(null)
  const [place, setPlace] = useState({ shift: 0, below: false })
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timer = 0
    let target: HTMLElement | null = null
    let warm = false

    const show = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      warm = true
      setCurrent({ text: el.dataset.tip!, key: el.dataset.key, body: bodies.get(el), x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
    }

    const hide = () => {
      clearTimeout(timer)
      target = null
      setCurrent(null)
      timer = window.setTimeout(() => (warm = false), 400)
    }

    const enter = (el: HTMLElement | null) => {
      if (el === target) return
      clearTimeout(timer)
      target = el
      if (!el) return hide()
      timer = window.setTimeout(() => show(el), warm ? 0 : 380)
    }

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      enter((e.target as Element).closest<HTMLElement>('[data-tip]'))
    }
    const onOut = (e: PointerEvent) => !e.relatedTarget && hide()
    const onFocus = (e: FocusEvent) => {
      const el = (e.target as Element).closest<HTMLElement>('[data-tip]')
      if (el?.matches(':focus-visible')) enter(el)
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointerdown', hide)
    document.addEventListener('keydown', hide)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', hide)
    window.addEventListener('scroll', hide, true)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointerdown', hide)
      document.removeEventListener('keydown', hide)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', hide)
      window.removeEventListener('scroll', hide, true)
    }
  }, [])

  useLayoutEffect(() => {
    if (!current || !box.current) return
    const half = box.current.offsetWidth / 2
    const min = 8 + half
    const max = innerWidth - 8 - half
    const below = current.top < 90 || current.top - 18 < box.current.offsetHeight
    setPlace({ shift: Math.min(max, Math.max(min, current.x)) - current.x, below })
  }, [current])

  if (!current) return null
  return (
    <div
      ref={box}
      className="tooltip"
      role="tooltip"
      data-rich={current.body ? '' : undefined}
      data-below={place.below || undefined}
      style={{ left: current.x + place.shift, top: place.below ? current.bottom + 10 : current.top - 10 }}
    >
      {current.body ?? (
        <>
          {current.text}
          {current.key && <kbd>{current.key}</kbd>}
        </>
      )}
    </div>
  )
}
