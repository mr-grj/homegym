import { useEffect, useRef, useState } from 'react'

/** Props that fade a scrolling list's top or bottom edge while more of it is hidden there; remeasures when `content` changes. */
export function useScrollFade<T extends HTMLElement>(content?: unknown) {
  const ref = useRef<T>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })

  const measure = () => {
    const el = ref.current
    if (!el) return
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }))
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [content])

  return { ref, onScroll: measure, 'data-fade-top': fade.top || undefined, 'data-fade-bottom': fade.bottom || undefined }
}
