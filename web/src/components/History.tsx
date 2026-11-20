import type { Session } from '../api'
import { dayKey, dayLabel, human } from '../format'
import { Icon } from './Icon'
import { tip } from './Tooltips'

export function History({ sessions, onDelete }: { sessions: Session[]; onDelete: (session: Session) => void }) {
  const days = Map.groupBy(sessions, (s) => dayKey(s.started_at))
  return (
    <div className="history">
      <header className="sheet-head">
        <h2>History</h2>
      </header>
      {days.size === 0 && <p className="empty">Nothing logged yet. Finish a timer and it lands here.</p>}
      {[...days].map(([day, items]) => (
        <section key={day} className="day">
          <h3>
            <span>{dayLabel(day)}</span>
            <span className="num">{human(items.reduce((sum, s) => sum + s.seconds, 0))}</span>
          </h3>
          <ul>
            {items.map((s) => {
              const done = s.blocks.filter((b) => b.done).length
              const details = [
                s.effort && `effort ${s.effort}/10`,
                s.blocks.length > 0 && `${done}/${s.blocks.length} blocks`,
                s.notes,
              ].filter(Boolean)
              return (
                <li key={s.id}>
                  <span className="when num">
                    {new Date(s.started_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="grow">
                    <b>{s.title}</b>
                    {details.length > 0 && <small>{details.join(' · ')}</small>}
                  </div>
                  <span className="num">{human(s.seconds)}</span>
                  <button className="icon-btn" onClick={() => onDelete(s)} {...tip(`Delete “${s.title}” (you can undo)`)}>
                    <Icon name="close" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
