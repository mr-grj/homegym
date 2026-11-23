import { dayKey, dayLabel } from '../format'
import { monthGrid, monthRange, type DayRange } from '../search'
import { Icon } from './Icon'
import { tip } from './Tooltips'

type Props = {
  counts: Map<string, number>
  shown: { y: number; m: number }
  earliest: string
  range: DayRange | null
  onShow: (y: number, m: number) => void
  onDay: (key: string) => void
  onMonth: (y: number, m: number) => void
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The first day of the week in this locale, 1 for Monday through 7 for Sunday. */
function firstDay() {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } }
    return (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay ?? 1
  } catch {
    return 1
  }
}

/** Month title like "November 2026". */
export const monthLabel = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export function Calendar({ counts, shown, earliest, range, onShow, onDay, onMonth }: Props) {
  const { y, m } = shown
  const first = firstDay()
  const weeks = monthGrid(y, m, first)
  const today = dayKey(new Date().toISOString())
  const month = `${y}-${pad(m + 1)}`
  const whole = monthRange(y, m)
  const monthOn = range?.from === whole.from && range.to === whole.to
  const step = (by: number) => {
    const d = new Date(y, m + by, 1)
    onShow(d.getFullYear(), d.getMonth())
  }
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 10, 1 + ((first + i) % 7)).toLocaleDateString(undefined, { weekday: 'narrow' }),
  )
  const logged = [...counts].filter(([k]) => k.startsWith(month)).reduce((sum, [, n]) => sum + n, 0)

  return (
    <div className="calendar">
      <div className="cal-head">
        <button
          className="cal-month"
          data-on={monthOn || undefined}
          disabled={!logged}
          onClick={() => onMonth(y, m)}
          {...tip(logged ? `Show all of ${monthLabel(y, m)}` : `Nothing logged in ${monthLabel(y, m)}`)}
        >
          {monthLabel(y, m)}
        </button>
        <button className="icon-btn" disabled={month <= earliest.slice(0, 7)} onClick={() => step(-1)} {...tip('Previous month')}>
          <Icon name="left" />
        </button>
        <button className="icon-btn" disabled={month >= today.slice(0, 7)} onClick={() => step(1)} {...tip('Next month')}>
          <Icon name="right" />
        </button>
      </div>
      <div className="cal-grid">
        {weekdays.map((name, i) => (
          <span key={i} className="cal-weekday" aria-hidden>
            {name}
          </span>
        ))}
        {weeks.flat().map((d, i) => {
          if (d === null) return <span key={i} />
          const key = `${month}-${pad(d)}`
          const n = counts.get(key) ?? 0
          return (
            <button
              key={i}
              className="cal-day num"
              data-has={n > 0 || undefined}
              data-today={key === today || undefined}
              data-on={(range && !monthOn && key >= range.from && key <= range.to) || undefined}
              disabled={!n}
              onClick={() => onDay(key)}
              {...tip(n ? `${dayLabel(key)} · ${n} logged` : `${dayLabel(key)} · nothing logged`)}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
