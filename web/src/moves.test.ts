import { describe, expect, test } from 'vitest'
import { BODY, centre, joint, keyPose, loopLength, poseAt, shape, shapePoints, VIEW, type Move, type Point } from './figure'
import { CHEER } from './catalog'
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
    ['Single-Arm Row', 'singleArmRow'],
    ['Hammer curls', 'bicepsCurl'],
    ['Chin-ups', 'pullUp'],
    ['Diamond push-ups', 'pushUp'],
    ['Bicycle crunches', 'bicycleCrunch'],
    ['Crunches', 'crunch'],
    ['Reverse crunches', 'reverseCrunch'],
    ['Toe touch crunches', 'toeTouchCrunch'],
    ['Standing toe touch', 'standingToeTouch'],
    ['Banded glute bridge', 'gluteBridge'],
    ['Tracțiuni', 'pullUp'],
    ['Fandări laterale', 'lateralLunge'],
    ["Runner's lunge", 'runnersLunge'],
    ['Shoulder circles and rolls', 'shoulderCircles'],
    ['Scapular push-ups', 'scapularPushUp'],
    ['Light band pull-aparts', 'bandPullApart'],
    ['Resistance band pull-aparts', 'bandPullApart'],
    ['Kettlebell halos', 'kettlebellHalo'],
    ['Single-arm kettlebell row', 'kettlebellRow'],
    ['Single-arm kettlebell press', 'singleArmKettlebellPress'],
    ['Kettlebell press', 'kettlebellPress'],
    ['Kneeling kettlebell biceps curls', 'kneelingKettlebellCurl'],
    ['Kettlebell floor pullovers', 'kettlebellPullover'],
    ['Dumbbell pullover', 'pullover'],
    ['Hand-to-hand kettlebell curls', 'handToHandCurl'],
    ['Resistance band lateral raises', 'bandLateralRaise'],
    ['Lateral raises', 'lateralRaise'],
    ['Doorway chest stretch', 'doorwayChestStretch'],
    ["Child's pose lat stretch", 'childsPoseLatStretch'],
    ['Band overhead triceps extensions', 'bandTricepsExtension'],
    ['Overhead triceps extensions', 'tricepsExtension'],
    ['Bent-over band rows', 'bandBentOverRow'],
    ['Resistance band rows', 'standingBandRow'],
    ['Lying toe taps', 'toeTaps'],
    ['Chair dips', 'benchDip'],
    ['Dumbbell kickbacks', 'kickback'],
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
    'Lunges with weights',
    'Deadlift',
    'Toe touch',
    'Toe touches',
    'Chest press',
    'Neck stretch',
    'Kettlebell row',
    'Kettlebell curl',
    'Lat stretch',
    'Dips',
    'Triceps dips',
    'Kickbacks',
    'Toe taps',
    'French press',
    'Arnold press',
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
    expect(moveFor('Single-arm kettlebell row - Left')).toMatchObject({ id: 'kettlebellRow', mirror: false })
    expect(moveFor('Single-arm kettlebell row - Right')).toMatchObject({ id: 'kettlebellRow', mirror: true })
    expect(moveFor('Single-arm kettlebell press - Left')).toMatchObject({ id: 'singleArmKettlebellPress', mirror: false })
    expect(moveFor('Single-arm kettlebell press - Right')).toMatchObject({ id: 'singleArmKettlebellPress', mirror: true })
    expect(moveFor('Left')).toBeNull()
  })

  test('kettlebell variants get their own demo, never a look-alike', () => {
    const ids = (names: string[]) => names.map((name) => moveFor(name)?.id ?? null)
    expect(
      ids([
        'Two-hand kettlebell swing',
        'Resistance band bent-over row',
        'Single-arm kettlebell high pull - Left',
        'Kettlebell high pull',
        'Kettlebell goblet thruster',
        'Dumbbell thruster',
        'Kettlebell reverse lunges',
        'Reverse lunges',
        'Kettlebell suitcase march',
        'Kettlebell around the world',
        'Kettlebell halos',
        'Kettlebell squat to front raise',
        'Kettlebell floor pullover',
        "Child's pose lat stretch",
        'Standing chest stretch',
      ]),
    ).toEqual([
      'kettlebellSwing',
      'bandBentOverRow',
      'kettlebellSwingHighPull',
      'kettlebellHighPull',
      'kettlebellGobletThruster',
      'thruster',
      'kettlebellReverseLunge',
      'reverseLunge',
      'kettlebellSuitcaseMarch',
      'kettlebellAroundTheWorld',
      'kettlebellHalo',
      'kettlebellSquatFrontRaise',
      'kettlebellPullover',
      'childsPoseLatStretch',
      'chestOpener',
    ])
    expect(moveFor('Single-arm kettlebell high pull - Right')?.mirror).toBe(true)
  })

  test('the examples show these demos', () => {
    const labels = new Map<string, string | null>()
    for (const source of Object.values(examples))
      for (const step of parseRoutine(source).steps) if (!step.rest) labels.set(step.label, moveFor(step.label)?.id ?? null)
    expect(Object.fromEntries([...labels].sort(([a], [b]) => a.localeCompare(b)))).toEqual({
      'Band chest press': 'bandChestPress',
      'Band lateral walk': 'monsterWalk',
      'Band overhead triceps extensions': 'bandTricepsExtension',
      'Band shoulder press': 'bandShoulderPress',
      'Bent-over band rows': 'bandBentOverRow',
      'Bird dog': 'birdDog',
      'Bodyweight squats': 'squat',
      'Calf raises': 'calfRaise',
      'Cat-cow': 'catCow',
      "Child's pose": 'childsPose',
      "Child's pose lat stretch": 'childsPoseLatStretch',
      Cobra: 'cobra',
      'Cross-body shoulder stretch': 'crossBodyStretch',
      'Dead bug': 'deadBug',
      'Decline push-ups': 'declinePushUp',
      'Doorway chest stretch': 'doorwayChestStretch',
      'Exhale through the mouth': null,
      'Glute bridge': 'gluteBridge',
      'Goblet squat': 'gobletSquat',
      'Half-kneeling hip flexor stretch, left': 'hipFlexorStretch',
      'Half-kneeling hip flexor stretch, right': 'hipFlexorStretch',
      'Hand-to-hand kettlebell curls': 'handToHandCurl',
      'Hip hinges, flat back': 'hipHinge',
      Hold: null,
      Inchworms: 'inchworm',
      'Incline push-ups': 'inclinePushUp',
      'Inhale through the nose': null,
      'Kettlebell floor press - Left': 'floorPress',
      'Kettlebell floor press - Right': 'floorPress',
      'Kettlebell floor pullovers': 'kettlebellPullover',
      'Kettlebell halos': 'kettlebellHalo',
      'Kettlebell swing': 'kettlebellSwing',
      'Kneeling kettlebell biceps curls': 'kneelingKettlebellCurl',
      'Lateral lunge': 'lateralLunge',
      'Leg swings': 'legSwings',
      'Light band pull-aparts': 'bandPullApart',
      'Plank shoulder taps': 'shoulderTaps',
      'Push-ups': 'pushUp',
      'Resistance band lateral raises': 'bandLateralRaise',
      'Resistance band pull-aparts': 'bandPullApart',
      'Reverse crunch': 'reverseCrunch',
      'Reverse lunges': 'reverseLunge',
      'Romanian deadlift': 'romanianDeadlift',
      'Scapular push-ups': 'scapularPushUp',
      'Shoulder and arm circles': 'armCircles',
      'Shoulder circles and rolls': 'shoulderCircles',
      'Side plank, left': 'sidePlank',
      'Side plank, right': 'sidePlank',
      'Single-arm kettlebell press - Left': 'singleArmKettlebellPress',
      'Single-arm kettlebell press - Right': 'singleArmKettlebellPress',
      'Single-arm kettlebell row - Left': 'kettlebellRow',
      'Single-arm kettlebell row - Right': 'kettlebellRow',
      'Single-leg glute bridge, left': 'singleLegGluteBridge',
      'Single-leg glute bridge, right': 'singleLegGluteBridge',
      'Sit comfortably': null,
      'Split squat, left': 'splitSquat',
      'Split squat, right': 'splitSquat',
      'Standing hamstring stretch': 'hamstringStretch',
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

  test('the finish celebration is never mistaken for an exercise', () => {
    expect(moveFor(CHEER.name)).toBeNull()
    expect(Object.values(MOVES)).not.toContain(CHEER)
  })
})

describe.each([...moves, ['the finish celebration', CHEER] as [string, Move]])('%s', (_, move) => {
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

  test('keeps every limb its own length unless the pose foreshortens it', () => {
    frames(move).forEach((pose) => {
      if (pose.shorten) return
      const s = shape(move, pose)
      for (const arm of s.arms) {
        expect(distance(arm[0], arm[1])).toBeCloseTo(BODY.upper, 3)
        expect(distance(arm[1], arm[2])).toBeCloseTo(BODY.fore, 3)
      }
      for (const leg of s.legs) {
        expect(distance(leg[0], leg[1])).toBeCloseTo(BODY.thigh, 3)
        expect(distance(leg[1], leg[2])).toBeCloseTo(BODY.shin, 3)
      }
    })
  })

  test('loops back to where it started', () => {
    const total = loopLength(move)
    expect(shape(move, poseAt(move, total))).toEqual(shape(move, poseAt(move, 0)))
  })
})

describe('every demo looks like its own exercise', () => {
  const traces = moves.map(([id, move]) => {
    const total = loopLength(move)
    const cx = centre(move)
    const times = total ? Array.from({ length: 16 }, (_, i) => (total * i) / 16) : [0]
    return { id, frames: times.map((t) => shapePoints(shape(move, poseAt(move, t))).map(([x, y]): Point => [x - cx, y])) }
  })
  const gap = (a: Point[], b: Point[]) => a.reduce((sum, p, i) => sum + distance(p, b[i]), 0) / a.length
  const near = (a: Point[][], b: Point[][]) => a.reduce((sum, f) => sum + Math.min(...b.map((g) => gap(f, g))), 0) / a.length
  const travel = (frames: Point[][]) => Math.max(...frames[0].map((_, i) => Math.max(...frames.map((f) => distance(f[i], frames[0][i])))))
  const stillAndMoving = (a: Point[][], b: Point[][]) => {
    const [still, moving] = [travel(a), travel(b)].sort((x, y) => x - y)
    return still < 0.005 && moving >= 0.1
  }

  test('no two demos with the same equipment move alike, unless one holds still and the other clearly moves', () => {
    const alike: string[] = []
    for (const [i, a] of traces.entries())
      for (const b of traces.slice(i + 1)) {
        if (a.frames[0].length !== b.frames[0].length) continue
        if (Math.max(near(a.frames, b.frames), near(b.frames, a.frames)) < 0.05 && !stillAndMoving(a.frames, b.frames)) alike.push(`${a.id} ~ ${b.id}`)
      }
    expect(alike).toEqual([])
  })
})

describe('planted hands and feet', () => {
  test('anchored joints never move', () => {
    for (const [, move] of moves.filter(([, m]) => m.anchor && !m.poses.some((p) => p.lift))) {
      for (const pose of frames(move)) expect(distance(joint(shape(move, pose), move.anchor!.joint), move.anchor!.at)).toBeLessThan(1e-6)
    }
  })

  test('a squat keeps the feet flat on the floor', () => {
    const move = MOVES.squat as Move
    for (const pose of frames(move)) expect(distance(shape(move, pose).legs[0][2], [0, 0.07])).toBeLessThan(1e-3)
  })

  test.each(['handToHandCurl', 'kettlebellAroundTheWorld'] as const)('a kettlebell passed from hand to hand is always held by one of them: %s', (id) => {
    const move = MOVES[id] as Move
    const holders = new Set<string>()
    for (const pose of frames(move)) {
      const s = shape(move, pose)
      const handle = (s.props[0] as { points: Point[] }).points[0]
      const near = distance(handle, joint(s, 'hand'))
      const far = distance(handle, joint(s, 'farHand'))
      expect(Math.min(near, far)).toBeLessThan(1e-3)
      if (Math.abs(near - far) > 0.05) holders.add(near < far ? 'near' : 'far')
    }
    expect(holders).toEqual(new Set(['near', 'far']))
  })

  test('around the world passes the bell in front of the body and behind it, both ways round', () => {
    const move = MOVES.kettlebellAroundTheWorld as Move
    const bell = (t: number) => {
      const s = shape(move, poseAt(move, t))
      return (s.props[0] as { points: Point[] }).points[0][0] - joint(s, 'hip')[0]
    }
    const half = loopLength(move) / 2
    for (const [from, to] of [[0, half], [half, 2 * half]]) {
      const xs = Array.from({ length: 61 }, (_, i) => bell(from + ((to - from) * i) / 60))
      expect(Math.max(...xs)).toBeGreaterThan(0.2)
      expect(Math.min(...xs)).toBeLessThan(-0.2)
    }
  })

  test('the swing high pull drives the elbow back at chest height, unlike an upright row', () => {
    const move = MOVES.kettlebellSwingHighPull as Move
    const s = shape(move, keyPose(move))
    const shoulder = joint(s, 'shoulder')
    expect(joint(s, 'elbow')[0]).toBeLessThan(shoulder[0] - 0.15)
    expect(joint(s, 'elbow')[1]).toBeLessThan(shoulder[1])
    expect(Math.abs(joint(s, 'hand')[1] - shoulder[1])).toBeLessThan(0.15)
  })

  test('the goblet thruster presses one bell overhead with both hands', () => {
    const move = MOVES.kettlebellGobletThruster as Move
    const s = shape(move, keyPose(move))
    expect(distance(joint(s, 'hand'), joint(s, 'farHand'))).toBeLessThan(1e-3)
    expect(joint(s, 'hand')[1]).toBeGreaterThan(joint(s, 'head')[1] + 0.2)
    expect(s.props.filter((p) => 'at' in p)).toHaveLength(1)
  })

  test('the squat to front raise lifts the bell no higher than the shoulders', () => {
    const move = MOVES.kettlebellSquatFrontRaise as Move
    const tops = frames(move).map((pose) => {
      const s = shape(move, pose)
      return joint(s, 'hand')[1] - joint(s, 'shoulder')[1]
    })
    expect(Math.max(...tops)).toBeLessThan(0.05)
    expect(Math.max(...tops)).toBeGreaterThan(-0.05)
  })

  test('a halo holds the bell upside down, above the hands', () => {
    const move = MOVES.kettlebellHalo as Move
    for (const pose of frames(move)) {
      const s = shape(move, pose)
      const [handle, bell] = (s.props[0] as { points: Point[] }).points
      expect(bell[1] - handle[1]).toBeCloseTo(0.12, 6)
    }
  })

  test('a push-up keeps the hands on the floor', () => {
    const move = MOVES.pushUp as Move
    for (const pose of frames(move)) expect(distance(shape(move, pose).arms[0][2], [0.35, 0.05])).toBeLessThan(1e-3)
  })

  test('a forearm plank rests elbows and hands on the floor', () => {
    for (const move of [MOVES.plank, MOVES.sidePlank] as Move[]) {
      const [, elbow, hand] = shape(move, keyPose(move)).arms[0]
      expect(elbow[1]).toBeCloseTo(0.05, 2)
      expect(hand[1]).toBeCloseTo(0.05, 2)
    }
  })
})
