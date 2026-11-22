import { describe, expect, test } from 'vitest'
import seed from '../../api/app/seed.txt?raw'
import { BODY, keyPose, loopLength, poseAt, shape, shapePoints, VIEW, centre, type Move, type Point } from './figure'
import { allNames, CATALOG, demoStep, moveFor, moveKey, MOVES } from './moves'
import { parseRoutine } from './routine'
import { arm, jump, finish } from './timer'

const examples = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true })
const moves = Object.entries(MOVES) as [string, Move][]
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])

function frames(move: Move) {
  const total = loopLength(move)
  const times = total ? Array.from({ length: 97 }, (_, i) => (total * i) / 96) : [0]
  return [...times.map((t) => poseAt(move, t)), keyPose(move)]
}

describe('matching names', () => {
  test('every name leads to exactly one demo', () => {
    const owner = new Map<string, string>()
    for (const { id, name } of allNames()) {
      const { key } = moveKey(name)
      expect(owner.get(key) ?? id, `${name} is also a name of ${owner.get(key)}`).toBe(id)
      owner.set(key, id)
      expect(moveFor(name)?.id).toBe(id)
    }
  })

  test('the catalog lists each demo once by its own name', () => {
    expect(CATALOG).toHaveLength(moves.length)
    expect(new Set(CATALOG).size).toBe(CATALOG.length)
    for (const [id, move] of moves) expect(moveFor(move.name)?.id).toBe(id)
  })

  test.each([
    ['Push-ups', 'pushUp'],
    ['PUSH UPS', 'pushUp'],
    ['push up', 'pushUp'],
    ['Flotări clasice', 'pushUp'],
    ['10x push-ups', 'pushUp'],
    ['Push-ups ×12', 'pushUp'],
    ['push-ups 12 reps', 'pushUp'],
    ["Child's pose", 'childsPose'],
    ['Childs pose', 'childsPose'],
    ['Cat-cow', 'catCow'],
    ['cat cow', 'catCow'],
    ['Bodyweight squats', 'squat'],
    ['Calf raises', 'calfRaise'],
    ['Band row', 'standingBandRow'],
    ['Band shoulder press', 'bandShoulderPress'],
    ['Shoulder press', 'overheadPress'],
    ['Plank', 'plank'],
    ['High plank', 'highPlank'],
    ['  Mountain   climbers ', 'mountainClimber'],
  ])('%s shows %s', (label, id) => {
    expect(moveFor(label)?.id).toBe(id)
  })

  test.each([
    'Quads',
    'Hamstrings',
    'Calves',
    'Hip flexors',
    'Hold',
    'Focus',
    'Inhale through the nose',
    'Exhale through the mouth',
    'Sit comfortably',
    'Anything that feels tight',
    'Rest',
    'Switch',
    'Go',
    'Row',
    'Press',
    'Bridge',
    'Stretch',
    'Dumbbell row',
    'Squat hold',
    'Plank jacks',
    'Plank walk',
    'Push-up to side plank',
    'Russian twist',
    'Thoracic rotations',
    "World's greatest stretch",
    '90/90 hip switches',
    'Hip circles',
    'Lunges with weights',
    'Wall sit',
    '',
  ])('%s shows nothing', (label) => {
    expect(moveFor(label)).toBeNull()
  })

  test('a named side mirrors the figure when it is not the side drawn', () => {
    expect(moveFor('Side plank')).toMatchObject({ id: 'sidePlank', mirror: false })
    expect(moveFor('Side plank, left')).toMatchObject({ id: 'sidePlank', mirror: false })
    expect(moveFor('Side plank, right')).toMatchObject({ id: 'sidePlank', mirror: true })
    expect(moveFor('Right side plank')).toMatchObject({ id: 'sidePlank', mirror: true })
    expect(moveFor('Reverse lunge (left)')).toMatchObject({ id: 'reverseLunge', mirror: true })
    expect(moveFor('Reverse lunge, right')).toMatchObject({ id: 'reverseLunge', mirror: false })
    expect(moveFor('Planșă laterală stânga')).toMatchObject({ id: 'sidePlank', mirror: false })
    expect(moveFor('Left')).toBeNull()
  })

  test('the examples and the seed show these demos', () => {
    const labels = new Map<string, string | null>()
    for (const source of [...Object.values(examples), seed])
      for (const step of parseRoutine(source).steps) if (!step.rest) labels.set(step.label, moveFor(step.label)?.id ?? null)
    expect(Object.fromEntries([...labels].sort(([a], [b]) => a.localeCompare(b)))).toEqual({
      '90/90 hip switches': null,
      'Alternating light lunges': 'lunge',
      'Anything that feels tight': null,
      'Aplecări din șold, spatele drept': 'hipHinge',
      'Band pull-aparts': 'bandPullApart',
      'Band row': 'standingBandRow',
      'Band shoulder press': 'bandShoulderPress',
      'Bodyweight squats': 'squat',
      Burpees: 'burpee',
      'Calf raises': 'calfRaise',
      'Calf stretch at the wall': 'calfStretch',
      'Cat-cow': 'catCow',
      'Dead bug': 'deadBug',
      'Deep squat hold': 'deepSquat',
      'Exhale through the mouth': null,
      'Fandări înapoi': 'reverseLunge',
      'Fandări ușoare alternativ': 'lunge',
      'Flotări clasice': 'pushUp',
      Focus: null,
      'Genuflexiuni fără greutate': 'squat',
      'Glute bridge': 'gluteBridge',
      'Goblet squat': 'gobletSquat',
      'Half-kneeling hip flexor stretch': 'hipFlexorStretch',
      'Hip circles': null,
      'Hip hinges, flat back': 'hipHinge',
      Hold: null,
      'Hollow hold': 'hollowHold',
      'Inhale through the nose': null,
      'Jump squats': 'jumpSquat',
      'Mountain climbers': 'mountainClimber',
      Plank: 'plank',
      'Push-ups': 'pushUp',
      'Ramat cu bandă elastică': 'standingBandRow',
      'Reverse lunges': 'reverseLunge',
      'Ridicări pe vârfuri': 'calfRaise',
      'Romanian deadlift': 'romanianDeadlift',
      'Rotiri de umeri și brațe': 'armCircles',
      'Shoulder and arm circles': 'armCircles',
      'Shoulder press cu bandă': 'bandShoulderPress',
      'Side plank, left': 'sidePlank',
      'Side plank, right': 'sidePlank',
      'Sit comfortably': null,
      'Standing hamstring stretch': 'hamstringStretch',
      'Standing quad stretch': 'quadStretch',
      'Thoracic rotations': null,
      'Wall slides': 'wallSlide',
      "World's greatest stretch": null,
    })
  })
})

describe('the step to show', () => {
  const routine = parseRoutine('## A\nPush-ups 30s\n~ Rest 10s\n~ Breathe 5s\nPlank 30s\n~ Rest 10s')

  test('the current exercise, the next one during a rest, nothing at the end', () => {
    const run = arm(routine)
    expect(demoStep(run)?.label).toBe('Push-ups')
    expect(demoStep(jump(run, 1, 0))?.label).toBe('Plank')
    expect(demoStep(jump(run, 2, 0))?.label).toBe('Plank')
    expect(demoStep(jump(run, 3, 0))?.label).toBe('Plank')
    expect(demoStep(jump(run, 4, 0))).toBeNull()
    expect(demoStep(finish(jump(run, 3, 0), 0))).toBeNull()
  })
})

describe.each(moves)('%s', (_, move) => {
  const shapes = frames(move).map((pose) => shape(move, pose))
  const cx = centre(move)

  test('stays above the floor and inside the frame', () => {
    for (const s of shapes)
      for (const [x, y] of shapePoints(s)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
        expect(y).toBeGreaterThan(-0.02)
        expect(y).toBeLessThan(VIEW.height - VIEW.floor - 0.12)
        expect(Math.abs(x - cx)).toBeLessThan(VIEW.width / 2 - 0.06)
      }
  })

  test('keeps every limb its own length', () => {
    for (const s of shapes) {
      for (const arm of s.arms) {
        expect(distance(arm[0], arm[1])).toBeCloseTo(BODY.upper, 3)
        expect(distance(arm[1], arm[2])).toBeCloseTo(BODY.fore, 3)
      }
      for (const leg of s.legs) {
        expect(distance(leg[0], leg[1])).toBeCloseTo(BODY.thigh, 3)
        expect(distance(leg[1], leg[2])).toBeCloseTo(BODY.shin, 3)
      }
    }
  })

  test('loops back to where it started', () => {
    const total = loopLength(move)
    expect(shape(move, poseAt(move, total))).toEqual(shape(move, poseAt(move, 0)))
  })
})

describe('planted hands and feet', () => {
  test('anchored joints never move', () => {
    for (const [, move] of moves.filter(([, m]) => m.anchor)) {
      for (const pose of frames(move)) {
        const s = shape(move, pose)
        const joint = { toe: s.legs[0][3], shoulder: s.neck[0] }[move.anchor!.joint as 'toe' | 'shoulder']
        expect(distance(joint, move.anchor!.at)).toBeLessThan(1e-6)
      }
    }
  })

  test('a squat keeps the feet flat on the floor', () => {
    const move = MOVES.squat as Move
    for (const pose of frames(move)) expect(distance(shape(move, pose).legs[0][2], [0, 0.07])).toBeLessThan(1e-3)
  })

  test('a push-up keeps the hands on the floor', () => {
    const move = MOVES.pushUp as Move
    for (const pose of frames(move)) expect(distance(shape(move, pose).arms[0][2], [0.35, 0.05])).toBeLessThan(1e-3)
  })
})
