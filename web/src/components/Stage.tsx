import type { CSSProperties, MouseEvent } from 'react'
import { clock } from '../format'
import { totalSeconds } from '../routine'
import { countdown, face, totalElapsed, type Run } from '../timer'
import { useNow } from '../workout'
import { Icon } from './Icon'
import { tip } from './Tooltips'

type Props = {
  run: Run
  elapsed: boolean
  onToggle: () => void
  onSkip: () => void
  onBack: () => void
  onStop: () => void
  onExtend: (seconds: number) => void
  onJump: (index: number) => void
  onMode: () => void
}

const contain = (e: MouseEvent) => e.stopPropagation()

/** What leaving the stage does right now, for buttons and hints. */
export function exitLabel(run: Run) {
  if (!run.startedAt) return 'Back to the start screen. Nothing is logged'
  if (run.routine.quick) return run.finishedAt ? 'Close' : 'Stop and log the time'
  return 'Stop, then review and save the workout'
}

function Timeline({ run, progress, onJump }: { run: Run; progress: number; onJump: (index: number) => void }) {
  const current = run.steps[run.index].block
  return (
    <div className="timeline">
      {run.routine.blocks.map((block, b) => {
        const items = run.steps.map((step, i) => ({ step, i })).filter(({ step }) => step.block === b)
        const weight = items.reduce((sum, { step }) => sum + (step.seconds ?? 30), 0)
        return (
          <div key={b} className="tl-block" data-current={b === current || undefined} style={{ flex: `${weight} 1 0` }}>
            <div className="tl-steps">
              {items.map(({ step, i }) => {
                const fill = run.finishedAt || i < run.index ? 1 : i === run.index ? progress : 0
                return (
                  <button
                    key={i}
                    className="tl-step"
                    data-rest={step.rest || undefined}
                    data-current={i === run.index || undefined}
                    style={{ flex: `${step.seconds ?? 30} 1 0` }}
                    {...tip(`Jump to ${step.label}${step.seconds === null ? '' : ` · ${clock(step.seconds)}`}`)}
                    onClick={() => onJump(i)}
                  >
                    <span>
                      <i style={{ transform: `scaleX(${fill})` }} />
                    </span>
                  </button>
                )
              })}
            </div>
            <span className="tl-name">{block.name}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Stage({ run, elapsed, onToggle, onSkip, onBack, onStop, onExtend, onJump, onMode }: Props) {
  const now = useNow()
  const f = face(run, now, elapsed)
  const next = run.steps[run.index + 1]
  const block = run.routine.blocks[f.step.block]
  const total = totalSeconds(run.steps)
  const multi = run.steps.length > 1
  const state = run.finishedAt ? 'done' : run.since !== null ? 'running' : run.startedAt ? 'paused' : 'armed'
  const urgent = countdown(run, now) !== null

  return (
    <main className="stage" data-state={state} onClick={onToggle} style={{ '--p': f.progress } as CSSProperties}>
      <div className="fill" />

      <header className="stage-head" onClick={contain}>
        {multi && (
          <>
            <Timeline run={run} progress={f.progress} onJump={onJump} />
            <div className="meta">
              <span>
                {block.name}
                {f.step.rounds > 1 && <em> · round {f.step.round}/{f.step.rounds}</em>}
              </span>
              <span className="num">
                {clock(Math.floor(totalElapsed(run, now) / 1000))}
                {total !== null && <em> / {clock(total)}</em>}
              </span>
            </div>
          </>
        )}
      </header>

      <section className="face">
        <div className={['time', f.display.length > 5 && 'long', urgent && 'urgent'].filter(Boolean).join(' ')}>
          {f.display}
        </div>
        {state !== 'done' && f.remaining !== null && (
          <button className="mode" onClick={(e) => (contain(e), onMode())} {...tip(f.elapsedMode ? 'Show time remaining' : 'Show time elapsed', 'T')}>
            {f.elapsedMode ? 'elapsed' : 'remaining'}
          </button>
        )}
        <h1 className="label">{state === 'done' ? 'Done' : f.step.label}</h1>
        {state !== 'done' && f.step.note && <p className="note">{f.step.note}</p>}
        {state !== 'done' && next && (
          <p className="next">
            Next · {next.label}
            {next.seconds !== null && ` · ${clock(next.seconds)}`}
          </p>
        )}
        <p className="cue">
          {state === 'armed' && <>Tap anywhere or press space to start<span className="keys-only"> · Esc to go back</span></>}
          {state === 'paused' && <>Paused<span className="keys-only"> · Esc to stop</span></>}
          {state === 'done' && (run.routine.quick ? 'Logged · tap to close' : 'Tap to finish')}
        </p>
      </section>

      <nav className="controls" onClick={contain}>
        {state !== 'done' && (
          <button onClick={onStop} {...tip(exitLabel(run), 'Esc')}>
            <Icon name="stop" />
          </button>
        )}
        {multi && state !== 'done' && (
          <button onClick={onBack} {...tip('Restart step (press twice for the previous one)', '←')}>
            <Icon name="prev" />
          </button>
        )}
        <button
          className="primary"
          onClick={onToggle}
          {...tip(state === 'running' ? 'Pause' : state === 'done' ? (run.routine.quick ? 'Close' : 'Finish and save') : state === 'armed' ? 'Start' : 'Resume', 'Space')}
        >
          <Icon name={state === 'running' ? 'pause' : state === 'done' ? 'check' : 'play'} />
        </button>
        {state !== 'done' && (
          <>
            <button onClick={onSkip} {...tip(multi ? 'Skip to the next step' : 'Finish now and log', '→')}>
              <Icon name={multi ? 'next' : 'check'} />
            </button>
            <button className="text" onClick={() => onExtend(60)} {...tip('Add a minute to this step (↓ removes one)', '↑')}>
              +1m
            </button>
          </>
        )}
      </nav>
    </main>
  )
}
