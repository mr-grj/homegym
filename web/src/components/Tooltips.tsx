import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type Tip = { text: string; key?: string; x: number; y: number; below: boolean }

/** Tooltip props for a button: visible hint, optional shortcut, accessible name. */
export const tip = (text: string, key?: string) => ({ 'data-tip': text, 'data-key': key, 'aria-label': text })

export function Tooltips() {
  const [current, setCurrent] = useState<Tip | null>(null)
  const [shift, setShift] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timer = 0
    let target: HTMLElement | null = null
    let warm = false

    const show = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      const below = r.top < 90
      warm = true
      setCurrent({ text: el.dataset.tip!, key: el.dataset.key, x: r.left + r.width / 2, y: below ? r.bottom + 10 : r.top - 10, below })
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
    setShift(Math.min(max, Math.max(min, current.x)) - current.x)
  }, [current])

  if (!current) return null
  return (
    <div
      ref={box}
      className="tooltip"
      role="tooltip"
      data-below={current.below || undefined}
      style={{ left: current.x + shift, top: current.y }}
    >
      {current.text}
      {current.key && <kbd>{current.key}</kbd>}
    </div>
  )
}
