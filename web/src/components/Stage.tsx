import { useMemo, useSyncExternalStore, type CSSProperties, type MouseEvent } from 'react'
import { clock } from '../format'
import { CHEER } from '../catalog'
import { headroom } from '../figure'
import { hasHints, hintNow } from '../hints'
import { demoStep, moveFor } from '../moves'
import { countdown, face, plannedSeconds, SIP_SECONDS, stepElapsed, totalElapsed, type Run } from '../timer'
import { POUR_DELAY, useNow, type Sips } from '../workout'
import { Demo } from './Demo'
import { Icon } from './Icon'
import { tip } from './Tooltips'
import { Water } from './Water'

type Props = {
  run: Run
  elapsed: boolean
  demos: boolean
  water: boolean
  sips: Sips | null
  onToggle: () => void
  onSkip: () => void
  onBack: () => void
  onStop: () => void
  onExtend: (seconds: number) => void
  onJump: (index: number) => void
  onMode: () => void
  onSip: () => void
  onGo: () => void
}

const contain = (e: MouseEvent) => e.stopPropagation()

const roomy =
  typeof matchMedia === 'function' ? matchMedia('(min-height: 680px), (min-aspect-ratio: 4 / 3) and (min-width: 900px) and (min-height: 521px)') : null
const watchRoomy = (change: () => void) => {
  roomy?.addEventListener('change', change)
  return () => roomy?.removeEventListener('change', change)
}
const useRoomy = () => useSyncExternalStore(watchRoomy, () => roomy?.matches ?? true)

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

export function Stage({ run, elapsed, demos, water: drinks, sips, onToggle, onSkip, onBack, onStop, onExtend, onJump, onMode, onSip, onGo }: Props) {
  const now = useNow()
  const f = face(run, now, elapsed)
  const next = run.steps[run.index + 1]
  const block = run.routine.blocks[f.step.block]
  const total = plannedSeconds(run)
  const multi = run.steps.length > 1
  const state = run.finishedAt ? 'done' : run.since !== null ? 'running' : run.startedAt ? 'paused' : 'armed'
  const urgent = countdown(run, now) !== null
  const slot = useMemo(() => demos && run.steps.some((s) => !s.rest && moveFor(s.label)), [demos, run.steps])
  const hinted = useMemo(() => slot && hasHints(run.steps), [slot, run.steps])
  const shown = demoStep(run)
  const demo = slot && shown ? moveFor(shown.label) : null
  const hint = demo && hinted ? hintNow(run, now) : null
  const into = stepElapsed(run, now)
  const tall = useRoomy()
  const drinking = !!sips && into >= sips.at && into - sips.at < SIP_SECONDS * 1000
  const refills = sips ? sips.count - (drinking ? 1 : 0) : 0
  const glass = drinks && state !== 'done' && run.startedAt && f.step.rest && (
    <Water
      key={`${run.index}-${refills}`}
      delay={refills ? 0 : state === 'running' && into < POUR_DELAY ? POUR_DELAY - into : null}
      hidden={state !== 'running'}
      drunk={sips && drinking ? (into - sips.at) / (SIP_SECONDS * 1000) : null}
      open={f.step.seconds === null}
      sips={sips?.count ?? 0}
      onSip={onSip}
    />
  )
  const above = !!demo && f.step.rest && tall
  const cheer = slot && !!run.finishedAt

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
        <div className="clock">
          {slot && (
            <div className="demo-slot" data-over={above || undefined} data-hinted={hinted || undefined}>
              {above && (
                <div className="demo-over">
                  <span className="demo-cue">Up next</span>
                  {glass}
                </div>
              )}
              {demo && (
                <Demo
                  key={`${demo.id}${demo.mirror}`}
                  id={demo.id}
                  move={demo.move}
                  mirror={demo.mirror}
                  playing={(state === 'running' && !f.preparing) || state === 'armed'}
                  dim={f.step.rest}
                  restart={run.index * 2 + (f.preparing ? 0 : 1)}
                />
              )}
              {cheer && (
                <Demo
                  key="cheer"
                  id="cheer"
                  move={CHEER}
                  mirror={false}
                  playing
                  dim={false}
                  restart={0}
                  loops={3}
                />
              )}
              {demo && f.step.rest && !above && (
                <span className="demo-cue" data-head style={{ top: `calc((100% - var(--hint, 0px)) * ${headroom(demo.move)})` }}>
                  Up next
                </span>
              )}
              {hint && (
                <p key={hint} className="demo-hint">
                  {hint}
                </p>
              )}
            </div>
          )}
          <div
            key={urgent ? f.display : 'time'}
            className={['time', f.display.length > 5 && 'long', urgent && 'urgent', f.preparing && 'prep'].filter(Boolean).join(' ')}
          >
            {f.display}
          </div>
        </div>
        {f.preparing ? (
          <button className="prep-cue" onClick={(e) => (contain(e), onGo())} {...tip('Ready? Start the exercise now', 'G')}>
            Get into position
          </button>
        ) : state !== 'done' && f.remaining !== null && (
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
          {!above && glass}
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
