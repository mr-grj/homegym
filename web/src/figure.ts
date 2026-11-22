export type Point = [number, number]

type Target = { at: Point; bend?: 1 | -1 }
export type Arm = [upper: number, fore: number] | Target
export type Leg = [thigh: number, shin: number, foot: number] | (Target & { foot?: number })

/** One key position: segment directions in degrees (0 up, 90 the way the figure faces, 180 down), hands or feet planted with `at`. */
export type Pose = {
  hip?: Point
  torso: number
  head?: number
  spine?: number
  arm: Arm
  farArm?: Arm
  leg: Leg
  farLeg?: Leg
  t?: number
  hold?: number
}

type Hand = 'near' | 'far' | 'both'
type Anchor = 'hand' | 'farHand' | 'foot' | 'farFoot' | Point
export type Joint = 'hip' | 'shoulder' | 'head' | 'knee' | 'farKnee' | 'ankle' | 'farAnkle' | 'toe' | 'farToe' | 'hand' | 'farHand' | 'elbow'

export type Prop =
  | { kind: 'kettlebell'; hand: Hand; swing?: boolean }
  | { kind: 'dumbbell'; hand: Hand }
  | { kind: 'band'; from: Anchor; to: Anchor }
  | { kind: 'wall'; x: number }

/** A demonstrated exercise: its key poses, view, timing, equipment and the joint that stays put. */
export type Move = {
  name: string
  view?: 'side' | 'front'
  side?: 'left' | 'right'
  narrow?: boolean
  anchor?: { joint: Joint; at: Point }
  poses: Pose[]
  beat?: number
  hold?: number
  ease?: 'linear'
  cycle?: boolean
  key?: number
  props?: Prop[]
}

export const BODY = { thigh: 0.44, shin: 0.44, torso: 0.5, neck: 0.07, head: 0.11, upper: 0.29, fore: 0.27, foot: 0.19, hips: 0.09, shoulders: 0.18 }

/** Where every joint of the figure is at one moment. */
export type Shape = {
  front: boolean
  head: Point
  neck: [Point, Point]
  torso: Point[]
  arms: [Point[], Point[]]
  legs: [Point[], Point[]]
  props: ({ kind: 'bell' | 'disc'; at: Point; handle?: Point } | { kind: 'band' | 'wall'; points: Point[] })[]
}

const rad = (deg: number) => (deg * Math.PI) / 180
const dir = (deg: number): Point => [Math.sin(rad(deg)), Math.cos(rad(deg))]
const add = (a: Point, b: Point, k = 1): Point => [a[0] + b[0] * k, a[1] + b[1] * k]
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const lerpPoint = (a: Point, b: Point, k: number): Point => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
const angleOf = (from: Point, to: Point) => (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI
const isTarget = (limb: Arm | Leg): limb is Target => !Array.isArray(limb)

function reach(base: Point, target: Point, a: number, b: number, bend: number): [Point, Point] {
  const dx = target[0] - base[0]
  const dy = target[1] - base[1]
  const span = Math.hypot(dx, dy) || 1e-6
  const d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, span))
  const ux = dx / span
  const uy = dy / span
  const turn = bend * Math.acos((a * a + d * d - b * b) / (2 * a * d))
  const joint: Point = [base[0] + a * (ux * Math.cos(turn) - uy * Math.sin(turn)), base[1] + a * (ux * Math.sin(turn) + uy * Math.cos(turn))]
  return [joint, [base[0] + ux * d, base[1] + uy * d]]
}

function armPoints(shoulder: Point, arm: Arm): Point[] {
  if (isTarget(arm)) {
    const [elbow, hand] = reach(shoulder, arm.at, BODY.upper, BODY.fore, arm.bend ?? -1)
    return [shoulder, elbow, hand]
  }
  const elbow = add(shoulder, dir(arm[0]), BODY.upper)
  return [shoulder, elbow, add(elbow, dir(arm[1]), BODY.fore)]
}

function legPoints(hip: Point, leg: Leg, foot: number): Point[] {
  if (isTarget(leg)) {
    const [knee, ankle] = reach(hip, leg.at, BODY.thigh, BODY.shin, leg.bend ?? 1)
    return [hip, knee, ankle, add(ankle, dir(leg.foot ?? 100), foot)]
  }
  const knee = add(hip, dir(leg[0]), BODY.thigh)
  const ankle = add(knee, dir(leg[1]), BODY.shin)
  return [hip, knee, ankle, add(ankle, dir(leg[2]), foot)]
}

const flip = (bend: number | undefined, fallback: number) => (-(bend ?? fallback)) as 1 | -1
const mirrorArm = (arm: Arm, cx: number): Arm => (isTarget(arm) ? { at: [2 * cx - arm.at[0], arm.at[1]], bend: flip(arm.bend, -1) } : [-arm[0], -arm[1]])
const mirrorLeg = (leg: Leg, cx: number): Leg =>
  isTarget(leg) ? { at: [2 * cx - leg.at[0], leg.at[1]], bend: flip(leg.bend, 1), foot: -(leg.foot ?? 100) } : [-leg[0], -leg[1], -leg[2]]

function limbs(pose: Pose, front: boolean, cx: number) {
  const farArm = pose.farArm ?? (front ? mirrorArm(pose.arm, cx) : pose.arm)
  const farLeg = pose.farLeg ?? (front ? mirrorLeg(pose.leg, cx) : pose.leg)
  return { arm: pose.arm, farArm, leg: pose.leg, farLeg }
}

function joint(s: Shape, name: Joint): Point {
  const [near, far] = s.legs
  const table: Record<Joint, Point> = {
    hip: s.front ? lerpPoint(near[0], far[0], 0.5) : near[0],
    shoulder: s.neck[0],
    head: s.head,
    knee: near[1],
    farKnee: far[1],
    ankle: near[2],
    farAnkle: far[2],
    toe: near[3],
    farToe: far[3],
    hand: s.arms[0][2],
    farHand: s.arms[1][2],
    elbow: s.arms[0][1],
  }
  return table[name]
}

function build(move: Move, pose: Pose, hip: Point): Shape {
  const front = move.view === 'front'
  const up = dir(pose.torso)
  const across: Point = [up[1], -up[0]]
  const top = add(hip, up, BODY.torso)
  const head = dir(pose.head ?? pose.torso)
  const neckEnd = add(top, head, BODY.neck)
  const { arm, farArm, leg, farLeg } = limbs(pose, front, hip[0])
  const foot = front ? BODY.foot * 0.55 : BODY.foot
  const width = move.narrow ? 0.02 : BODY.hips
  const hips: [Point, Point] = front ? [add(hip, across, width), add(hip, across, -width)] : [hip, hip]
  const shoulders: [Point, Point] = front ? [add(top, across, BODY.shoulders), add(top, across, -BODY.shoulders)] : [top, top]
  return {
    front,
    head: add(neckEnd, head, BODY.head),
    neck: [top, neckEnd],
    torso: front ? [hips[0], hips[1], shoulders[1], shoulders[0]] : [hip, add(add(hip, up, BODY.torso / 2), across, pose.spine ?? 0), top],
    arms: [armPoints(shoulders[0], arm), armPoints(shoulders[1], farArm)],
    legs: [legPoints(hips[0], leg, foot), legPoints(hips[1], farLeg, foot)],
    props: [],
  }
}

const HIP: Point = [0, 0.95]

/** Where the hip goes so the move's anchor joint stays where it belongs. */
export function placeHip(move: Move, pose: Pose): Point {
  if (!move.anchor) return pose.hip ?? HIP
  const probe = joint(build(move, pose, [0, 0]), move.anchor.joint)
  return [move.anchor.at[0] - probe[0], move.anchor.at[1] - probe[1]]
}

/** Joint and equipment positions of one pose. */
export function shape(move: Move, pose: Pose): Shape {
  const result = build(move, pose, placeHip(move, pose))
  const { arms, legs } = result
  const hand = (which: Hand): Point => (which === 'far' ? arms[1][2] : which === 'near' ? arms[0][2] : lerpPoint(arms[0][2], arms[1][2], 0.5))
  const anchor = (a: Anchor): Point =>
    Array.isArray(a) ? a : a === 'hand' ? arms[0][2] : a === 'farHand' ? arms[1][2] : a === 'foot' ? legs[0][3] : legs[1][3]
  for (const prop of move.props ?? []) {
    if (prop.kind === 'kettlebell') {
      const at = hand(prop.hand)
      const along = prop.swing ? dir(angleOf(arms[0][1], arms[0][2])) : dir(180)
      result.props.push({ kind: 'bell', at: add(at, along, 0.12), handle: at })
    } else if (prop.kind === 'dumbbell') {
      for (const which of prop.hand === 'both' ? (['near', 'far'] as const) : [prop.hand]) result.props.push({ kind: 'disc', at: hand(which) })
    } else if (prop.kind === 'band') {
      result.props.push({ kind: 'band', points: [anchor(prop.from), anchor(prop.to)] })
    } else {
      result.props.push({ kind: 'wall', points: [[prop.x, 0], [prop.x, 2.1]] })
    }
  }
  return result
}

function asAngles(limb: Arm | Leg, base: Point, other: Arm | Leg, isLeg: boolean): number[] {
  const near = (value: number, to: number) => value + 360 * Math.round((to - value) / 360)
  if (!isTarget(limb)) return limb
  const points = isLeg ? legPoints(base, limb as Leg, BODY.foot) : armPoints(base, limb as Arm)
  const angles = points.slice(1).map((p, i) => angleOf(points[i], p))
  if (isLeg) angles[2] = (limb as { foot?: number }).foot ?? 100
  return isTarget(other) ? angles : angles.map((a, i) => near(a, other[i]))
}

function blendLimb<T extends Arm | Leg>(a: T, b: T, k: number, baseA: Point, baseB: Point, isLeg: boolean): T {
  if (isTarget(a) && isTarget(b)) {
    const blended: Target & { foot?: number } = { at: lerpPoint(a.at, b.at, k), bend: k < 0.5 ? a.bend : b.bend }
    if (isLeg) blended.foot = lerp((a as { foot?: number }).foot ?? 100, (b as { foot?: number }).foot ?? 100, k)
    return blended as T
  }
  const from = asAngles(a, baseA, b, isLeg)
  const to = asAngles(b, baseB, a, isLeg)
  return from.map((v, i) => lerp(v, to[i], k)) as T
}

/** The pose between `a` and `b` at progress `k` (0 to 1): planted hands and feet stay put, free limbs swing. */
export function blend(move: Move, a: Pose, b: Pose, k: number): Pose {
  const front = move.view === 'front'
  const sa = build(move, a, placeHip(move, a))
  const sb = build(move, b, placeHip(move, b))
  const la = limbs(a, front, joint(sa, 'hip')[0])
  const lb = limbs(b, front, joint(sb, 'hip')[0])
  return {
    hip: lerpPoint(joint(sa, 'hip'), joint(sb, 'hip'), k),
    torso: lerp(a.torso, b.torso, k),
    head: lerp(a.head ?? a.torso, b.head ?? b.torso, k),
    spine: lerp(a.spine ?? 0, b.spine ?? 0, k),
    arm: blendLimb(la.arm, lb.arm, k, sa.arms[0][0], sb.arms[0][0], false),
    farArm: blendLimb(la.farArm, lb.farArm, k, sa.arms[1][0], sb.arms[1][0], false),
    leg: blendLimb(la.leg, lb.leg, k, sa.legs[0][0], sb.legs[0][0], true),
    farLeg: blendLimb(la.farLeg, lb.farLeg, k, sa.legs[1][0], sb.legs[1][0], true),
  }
}

const BEAT = 900
const HOLD = 180

const segments = (move: Move) => {
  const poses = move.poses
  const count = move.cycle ? poses.length - 1 : poses.length
  return poses.slice(0, count).map((pose, i) => ({
    from: pose,
    to: poses[(i + 1) % poses.length],
    hold: pose.hold ?? move.hold ?? HOLD,
    move: pose.t ?? move.beat ?? BEAT,
  }))
}

/** Milliseconds one loop of the move takes, 0 for a still pose. */
export function loopLength(move: Move): number {
  if (move.poses.length < 2) return 0
  return segments(move).reduce((sum, s) => sum + s.hold + s.move, 0)
}

const ease = (k: number, linear: boolean) => (linear ? k : 0.5 - Math.cos(Math.PI * k) / 2)

/** The pose shown `ms` into the loop. */
export function poseAt(move: Move, ms: number): Pose {
  const total = loopLength(move)
  if (!total) return move.poses[0]
  let t = ((ms % total) + total) % total
  for (const s of segments(move)) {
    if (t < s.hold) return s.from
    t -= s.hold
    if (t < s.move) return blend(move, s.from, s.to, ease(t / s.move, move.ease === 'linear'))
    t -= s.move
  }
  return move.poses[0]
}

/** The pose that best shows the move when it cannot animate. */
export const keyPose = (move: Move) => move.poses[move.key ?? (move.poses.length > 1 ? 1 : 0)]

/** Every point a shape covers, for bounds and checks. */
export function shapePoints(s: Shape): Point[] {
  const props = s.props.flatMap((p) => (p.kind === 'wall' ? [] : 'points' in p ? p.points : [p.at]))
  return [s.head, ...s.neck, ...s.torso, ...s.arms.flat(), ...s.legs.flat(), ...props]
}

export const VIEW = { width: 2.5, height: 2.4, floor: 0.06 }

/** Horizontal centre of the move over a whole loop, so the camera never moves. */
export function centre(move: Move): number {
  const total = loopLength(move)
  const xs: number[] = []
  for (let i = 0; i <= 24; i++) for (const [x] of shapePoints(shape(move, poseAt(move, (total * i) / 24)))) xs.push(x)
  return (Math.min(...xs) + Math.max(...xs)) / 2
}

/** One drawable piece of the figure: a stroked path, a filled outline or a dot. */
export type Part = { tone: 'body' | 'far' | 'prop' | 'band' | 'wall'; width: number } & ({ points: Point[]; fill?: boolean } | { at: Point; r: number })

const LIMB = 0.1

/** The pieces to draw for a shape, back to front; the count and order never change within a move. */
export function parts(s: Shape): Part[] {
  const back: Part[] = []
  const props: Part[] = []
  for (const p of s.props) {
    if ('points' in p) back.push({ tone: p.kind, width: p.kind === 'wall' ? 0.04 : 0.025, points: p.points })
    else if (p.kind === 'bell') props.push({ tone: 'prop', width: 0.03, points: [p.handle ?? p.at, p.at] }, { tone: 'prop', width: 0, at: p.at, r: 0.075 })
    else props.push({ tone: 'prop', width: 0, at: p.at, r: 0.065 })
  }
  const far = s.front ? 'body' : 'far'
  const torso: Part = s.front ? { tone: 'body', width: LIMB, points: [...s.torso, s.torso[0]], fill: true } : { tone: 'body', width: 0.2, points: s.torso }
  return [
    ...back,
    { tone: far, width: LIMB, points: s.legs[1] },
    { tone: far, width: LIMB, points: s.arms[1] },
    torso,
    { tone: 'body', width: 0.09, points: s.neck },
    { tone: 'body', width: 0, at: s.head, r: BODY.head },
    { tone: 'body', width: LIMB, points: s.legs[0] },
    { tone: 'body', width: LIMB, points: s.arms[0] },
    ...props,
  ]
}
