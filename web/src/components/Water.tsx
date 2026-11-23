import { useId, useState, type CSSProperties } from 'react'
import { SIP_SECONDS } from '../timer'
import { tip } from './Tooltips'

type Props = { delay: number | null; hidden: boolean; drunk: number | null; open: boolean; sips: number; onSip: () => void }

const FULL = 0.8
const EMPTY = 0.12
const DEPTH = 18

/** A glass that fills during a rest; a tap adds time to drink, and it refills once that time is used. */
export function Water({ delay, hidden, drunk, open, sips, onSip }: Props) {
  const clip = useId()
  const [pour] = useState(delay)
  const drinking = drunk !== null
  const level = FULL - (FULL - EMPTY) * Math.min(1, Math.max(0, drunk ?? 0))
  const style = { '--delay': `${pour ?? 0}ms`, '--drop': `${(1 - level) * DEPTH}px` } as CSSProperties

  return (
    <button
      className="water"
      data-pour={pour !== null || undefined}
      data-hidden={hidden || undefined}
      aria-disabled={drinking || open || undefined}
      tabIndex={hidden ? -1 : undefined}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        if (!drinking && !open) onSip()
      }}
      {...tip(
        open
          ? 'This rest lasts until you press →, so take your time'
          : drinking
            ? 'Enjoy. The glass refills when these seconds run out'
            : `Take a sip: add ${SIP_SECONDS} seconds to this rest`,
        open ? undefined : 'W',
      )}
    >
      <svg className="glass" viewBox="0 0 20 24" aria-hidden>
        <clipPath id={clip}>
          <path d="M4.2 3.2H15.8L14.4 20.6Q14.3 21.4 13.5 21.4H6.5Q5.7 21.4 5.6 20.6Z" />
        </clipPath>
        {pour !== null && <rect className="stream" x="9.3" y="-7" width="1.4" height="28" rx="0.7" />}
        <g clipPath={`url(#${clip})`}>
          <g className="level">
            <g className="rise">
              <path className="wave" d="M-12 3.4q2.5-1.2 5 0t5 0 5 0 5 0 5 0 5 0 5 0 5 0V30H-12Z" />
            </g>
          </g>
        </g>
        <path className="glass-edge" d="M3.2 2.2H16.8L15.3 20.8Q15.1 22.4 13.5 22.4H6.5Q4.9 22.4 4.7 20.8Z" />
      </svg>
      <span>{drinking ? 'Drinking' : 'Sip some water'}</span>
      {drinking && (
        <em key={sips} className="sip">
          +{SIP_SECONDS}s
        </em>
      )}
    </button>
  )
}
