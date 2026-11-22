import { memo, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { centre, keyPose, loopLength, parts, poseAt, shape, VIEW, type Move, type Part, type Point } from '../figure'

type Props = { id: string; move: Move; mirror: boolean; playing: boolean; dim: boolean; restart: number }

const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
const watchMotion = (change: () => void) => {
  motion?.addEventListener('change', change)
  return () => motion?.removeEventListener('change', change)
}
const useStill = () => useSyncExternalStore(watchMotion, () => motion?.matches ?? false)

const FRAME = 1000 / 30 - 4

const round = (n: number) => Math.round(n * 1000) / 1000

type Place = (p: Point) => [number, number]
const joined = (points: Point[], place: Place) => points.map((p) => place(p).join(',')).join(' ')

function Pieces({ list, place }: { list: Part[]; place: Place }) {
  return list.map((part, i) =>
    'at' in part ? (
      <circle key={i} data-tone={part.tone} cx={place(part.at)[0]} cy={place(part.at)[1]} r={part.r} />
    ) : (
      <polyline key={i} data-tone={part.tone} data-fill={part.fill || undefined} points={joined(part.points, place)} strokeWidth={part.width} />
    ),
  )
}

/** A looping figure showing how to do the exercise; follows the timer and freezes under reduced motion. */
export const Demo = memo(function Demo({ id, move, mirror, playing, dim, restart }: Props) {
  const still = useStill()
  const body = useRef<SVGGElement>(null)
  const time = useRef(0)
  const cx = useMemo(() => centre(move), [move])
  const loop = loopLength(move)
  const place: Place = (p) => [round((mirror ? -1 : 1) * (p[0] - cx)), round(-p[1])]
  const animate = loop > 0 && !still

  useEffect(() => {
    time.current = 0
  }, [restart, move])

  useEffect(() => {
    const g = body.current
    if (!g || !animate) return
    const draw = () => {
      parts(shape(move, poseAt(move, time.current))).forEach((part, i) => {
        const el = g.children[i]
        if ('at' in part) {
          const [x, y] = place(part.at)
          el.setAttribute('cx', String(x))
          el.setAttribute('cy', String(y))
        } else el.setAttribute('points', joined(part.points, place))
      })
    }
    draw()
    if (!playing) return
    let frame = 0
    let last = performance.now()
    let drawn = 0
    const tick = (now: number) => {
      time.current += Math.min(100, now - last)
      last = now
      if (now - drawn >= FRAME) {
        drawn = now
        draw()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [move, mirror, playing, animate, restart])

  const first = parts(shape(move, animate ? poseAt(move, time.current) : keyPose(move)))
  const ghost = still && move.poses.length > 1 ? parts(shape(move, move.poses[0])) : null
  const { width, height, floor } = VIEW

  return (
    <svg
      className="demo"
      viewBox={`${-width / 2} ${floor - height} ${width} ${height}`}
      data-move={id}
      data-dim={dim || undefined}
      data-playing={(animate && playing) || undefined}
      aria-hidden
    >
      <line className="demo-floor" x1={-width / 2} x2={width / 2} y1={0} y2={0} />
      {ghost && (
        <g className="demo-ghost">
          <Pieces list={ghost} place={place} />
        </g>
      )}
      <g ref={body}>
        <Pieces list={first} place={place} />
      </g>
    </svg>
  )
})
