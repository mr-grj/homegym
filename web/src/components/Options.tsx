import { PREP_SECONDS, SIP_SECONDS } from '../timer'
import type { Prefs } from '../workout'

type Props = { prefs: Prefs; onFlip: (key: 'prep' | 'water' | 'demos') => void }

const rows: ['prep' | 'water' | 'demos', string, string][] = [
  [
    'prep',
    'Time to get into position',
    `${PREP_SECONDS} seconds before each exercise, ending in a 3-2-1 countdown. Tap “Get into position” or press G to start sooner. R switches it anytime.`,
  ],
  [
    'water',
    'Water reminder',
    `A glass of water on every rest. Tap it or press W for ${SIP_SECONDS} more seconds to drink.`,
  ],
  ['demos', 'Exercise demos', 'A looping figure that shows how each exercise is done. D switches it anytime.'],
]

/** Switches for the optional parts of a workout. */
export function Options({ prefs, onFlip }: Props) {
  return (
    <div className="picker options">
      <header className="sheet-head">
        <h2>Workout</h2>
      </header>
      {rows.map(([key, title, text]) => (
        <label key={key} className="follow" data-option={key}>
          <input type="checkbox" checked={prefs[key]} onChange={() => onFlip(key)} />
          <span>
            <b>{title}</b>
            <small>{text}</small>
          </span>
        </label>
      ))}
    </div>
  )
}
