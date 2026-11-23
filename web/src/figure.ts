export type Point = [number, number]

type Target = { at: Point; bend?: 1 | -1 }
export type Arm = [upper: number, fore: number] | Target
export type Leg = [thigh: number, shin: number, foot: number] | (Target & { foot?: number })
type Segment = 'torso' | 'upper' | 'fore' | 'thigh' | 'shin'

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
  lift?: number
  grip?: number
  shorten?: Partial<Record<Segment, number>>
  t?: number
  hold?: number
}

type Hand = 'near' | 'far' | 'both' | 'pass'
type Anchor = 'hand' | 'farHand' | 'foot' | 'farFoot' | 'knee' | 'farKnee' | Point
export type Joint = 'hip' | 'shoulder' | 'head' | 'knee' | 'farKnee' | 'ankle' | 'farAnkle' | 'toe' | 'farToe' | 'hand' | 'farHand' | 'elbow'

export type Prop =
  | { kind: 'kettlebell'; hand: Hand; swing?: boolean; upright?: boolean }
  | { kind: 'dumbbell'; hand: Hand }
  | { kind: 'medball'; hand: Hand }
  | { kind: 'wheel' }
  | { kind: 'band'; from: Anchor; to: Anchor }
  | { kind: 'wall'; x: number }
  | { kind: 'bench'; at: Point; length?: number; angle?: number }
  | { kind: 'box'; at: Point; w?: number; h?: number }
  | { kind: 'bar'; at: Point; half?: number }
  | { kind: 'ball'; at: Point; r?: number }
  | { kind: 'roller'; at: Point; r?: number }

/** A demonstrated exercise: its key poses, view, timing, equipment and the joint that stays put. */
export type Move = {
  name: string
  view?: 'side' | 'front'
  side?: 'left' | 'right'
  narrow?: boolean
  anchor?: { joint: Joint; at: Point }
  contact?: { joint: Joint; y: number }
  poses: Pose[]
  beat?: number
  hold?: number
  ease?: 'linear'
  cycle?: boolean
  key?: number
  props?: Prop[]
}

export const BODY = { thigh: 0.44, shin: 0.44, torso: 0.5, neck: 0.07, head: 0.11, upper: 0.29, fore: 0.27, foot: 0.19, hips: 0.09, shoulders: 0.18 }

/** One drawable piece of the figure: a stroked path, a filled outline or a dot. */
export type Part = { tone: 'body' | 'far' | 'prop' | 'fixture' | 'band' | 'wall'; width: number } & ({ points: Point[]; fill?: boolean } | { at: Point; r: number })

/** Where every joint of the figure is at one moment, plus its equipment behind or in front of it. */
export type Shape = {
  front: boolean
  head: Point
  neck: [Point, Point]
  torso: Point[]
  arms: [Point[], Point[]]
  legs: [Point[], Point[]]
  grip: number
  props: (Part & { front: boolean })[]
}

type Lengths = Record<Segment, number>

const rad = (deg: number) => (deg * Math.PI) / 180
const dir = (deg: number): Point => [Math.sin(rad(deg)), Math.cos(rad(deg))]
const add = (a: Point, b: Point, k = 1): Point => [a[0] + b[0] * k, a[1] + b[1] * k]
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const turn = (a: number, b: number, k: number) => a + ((((b - a + 180) % 360) + 360) % 360 - 180) * k
const lerpPoint = (a: Point, b: Point, k: number): Point => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
const angleOf = (from: Point, to: Point) => (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI
const isTarget = (limb: Arm | Leg): limb is Target => !Array.isArray(limb)

const lengths = (pose: Pose): Lengths => {
  const scale = pose.shorten ?? {}
  return {
    torso: BODY.torso * (scale.torso ?? 1),
    upper: BODY.upper * (scale.upper ?? 1),
    fore: BODY.fore * (scale.fore ?? 1),
    thigh: BODY.thigh * (scale.thigh ?? 1),
    shin: BODY.shin * (scale.shin ?? 1),
  }
}

function reach(base: Point, target: Point, a: number, b: number, bend: number): [Point, Point] {
  const dx = target[0] - base[0]
  const dy = target[1] - base[1]
  const span = Math.hypot(dx, dy) || 1e-6
  const d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, span))
  const ux = dx / span
  const uy = dy / span
  const bent = bend * Math.acos((a * a + d * d - b * b) / (2 * a * d))
  const joint: Point = [base[0] + a * (ux * Math.cos(bent) - uy * Math.sin(bent)), base[1] + a * (ux * Math.sin(bent) + uy * Math.cos(bent))]
  return [joint, [base[0] + ux * d, base[1] + uy * d]]
}

function armPoints(shoulder: Point, arm: Arm, len: Lengths): Point[] {
  if (isTarget(arm)) {
    const [elbow, hand] = reach(shoulder, arm.at, len.upper, len.fore, arm.bend ?? -1)
    return [shoulder, elbow, hand]
  }
  const elbow = add(shoulder, dir(arm[0]), len.upper)
  return [shoulder, elbow, add(elbow, dir(arm[1]), len.fore)]
}

function legPoints(hip: Point, leg: Leg, foot: number, len: Lengths): Point[] {
  if (isTarget(leg)) {
    const [knee, ankle] = reach(hip, leg.at, len.thigh, len.shin, leg.bend ?? 1)
    return [hip, knee, ankle, add(ankle, dir(leg.foot ?? 100), foot)]
  }
  const knee = add(hip, dir(leg[0]), len.thigh)
  const ankle = add(knee, dir(leg[1]), len.shin)
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

/** Where a named joint is in a shape. */
export function joint(s: Shape, name: Joint): Point {
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
  const len = lengths(pose)
  const up = dir(pose.torso)
  const across: Point = [up[1], -up[0]]
  const top = add(hip, up, len.torso)
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
    torso: front ? [hips[0], hips[1], shoulders[1], shoulders[0]] : [hip, add(add(hip, up, len.torso / 2), across, pose.spine ?? 0), top],
    arms: [armPoints(shoulders[0], arm, len), armPoints(shoulders[1], farArm, len)],
    legs: [legPoints(hips[0], leg, foot, len), legPoints(hips[1], farLeg, foot, len)],
    grip: pose.grip ?? 0,
    props: [],
  }
}

const HIP: Point = [0, 0.95]

/** Where the hip goes so the move's anchor joint stays where it belongs, raised by the pose's lift. */
export function placeHip(move: Move, pose: Pose): Point {
  const lift = pose.lift ?? 0
  if (!move.anchor) {
    const [x, y] = pose.hip ?? HIP
    return [x, y + lift]
  }
  const probe = joint(build(move, pose, [0, 0]), move.anchor.joint)
  return [move.anchor.at[0] - probe[0], move.anchor.at[1] - probe[1] + lift]
}

const fixture = (points: Point[], width: number, fill = false): Part & { front: boolean } => ({ tone: 'fixture', width, points, fill, front: false })

function equipment(prop: Prop, s: Shape): (Part & { front: boolean })[] {
  const { arms, legs } = s
  const hand = (which: Hand): Point =>
    which === 'far' ? arms[1][2] : which === 'near' ? arms[0][2] : lerpPoint(arms[0][2], arms[1][2], which === 'pass' ? s.grip : 0.5)
  const anchor = (a: Anchor): Point => {
    if (Array.isArray(a)) return a
    const at = { hand: arms[0][2], farHand: arms[1][2], foot: legs[0][3], farFoot: legs[1][3], knee: legs[0][1], farKnee: legs[1][1] }
    return at[a]
  }
  const held = (which: Hand) => (which === 'both' ? (['near', 'far'] as const) : [which])
  switch (prop.kind) {
    case 'kettlebell':
      return held(prop.hand).flatMap((which): (Part & { front: boolean })[] => {
        const at = hand(which)
        const arm = arms[which === 'far' || (which === 'pass' && s.grip > 0.5) ? 1 : 0]
        const bell = add(at, prop.swing ? dir(angleOf(arm[1], arm[2])) : dir(prop.upright ? 0 : 180), 0.12)
        return [
          { tone: 'prop', width: 0.03, points: [at, bell], front: true },
          { tone: 'prop', width: 0, at: bell, r: 0.075, front: true },
        ]
      })
    case 'dumbbell':
      return held(prop.hand).map((which) => ({ tone: 'prop', width: 0, at: hand(which), r: 0.065, front: true }))
    case 'medball':
      return [{ tone: 'prop', width: 0, at: hand(prop.hand), r: 0.11, front: true }]
    case 'wheel':
      return [{ tone: 'prop', width: 0, at: add(hand('both'), [0, -0.03]), r: 0.09, front: true }]
    case 'band':
      return [{ tone: 'band', width: 0.025, points: [anchor(prop.from), anchor(prop.to)], front: false }]
    case 'wall':
      return [{ tone: 'wall', width: 0.04, points: [[prop.x, 0], [prop.x, 2.1]], front: false }]
    case 'bench': {
      const length = prop.length ?? 1.1
      const along = dir(prop.angle ?? 90)
      const ends: [Point, Point] = [add(prop.at, along, -length / 2), add(prop.at, along, length / 2)]
      const feet = [-0.36, 0.36].map((k) => add(prop.at, along, length * k)).map((p): Point[] => [p, [p[0], Math.min(p[1], 0.01)]])
      return [fixture(ends, 0.09), ...feet.map((leg) => fixture(leg, 0.04))]
    }
    case 'box': {
      const w = (prop.w ?? 0.45) / 2
      const h = prop.h ?? 0.45
      const [x, y] = prop.at
      return [fixture([[x - w, y], [x + w, y], [x + w, y + h], [x - w, y + h], [x - w, y]], 0.03, true)]
    }
    case 'bar': {
      const [x, y] = prop.at
      const half = prop.half ?? 0.35
      return [fixture([[x - half, y], [x + half, y]], 0.045), fixture([[x - half, y], [x - half, y + 0.12]], 0.03), fixture([[x + half, y], [x + half, y + 0.12]], 0.03)]
    }
    case 'ball':
      return [{ tone: 'fixture', width: 0, at: prop.at, r: prop.r ?? 0.33, front: false }]
    case 'roller':
      return [{ tone: 'fixture', width: 0, at: prop.at, r: prop.r ?? 0.08, front: false }]
  }
}

function tilt(s: Shape, pivot: Point, target: Joint, y: number): Shape {
  const [px, py] = joint(s, target)
  const dx = px - pivot[0]
  const dy = py - pivot[1]
  const radius = Math.hypot(dx, dy)
  if (radius < 1e-6) return s
  const phase = Math.atan2(dy, dx)
  const reachable = Math.max(-1, Math.min(1, (y - pivot[1]) / radius))
  const options = [Math.asin(reachable) - phase, Math.PI - Math.asin(reachable) - phase].map((a) => Math.atan2(Math.sin(a), Math.cos(a)))
  const angle = options.reduce((best, a) => (Math.abs(a) < Math.abs(best) ? a : best))
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const spin = ([qx, qy]: Point): Point => [pivot[0] + (qx - pivot[0]) * cos - (qy - pivot[1]) * sin, pivot[1] + (qx - pivot[0]) * sin + (qy - pivot[1]) * cos]
  return {
    ...s,
    head: spin(s.head),
    neck: [spin(s.neck[0]), spin(s.neck[1])],
    torso: s.torso.map(spin),
    arms: [s.arms[0].map(spin), s.arms[1].map(spin)],
    legs: [s.legs[0].map(spin), s.legs[1].map(spin)],
  }
}

/** Joint and equipment positions of one pose. */
export function shape(move: Move, pose: Pose): Shape {
  const built = build(move, pose, placeHip(move, pose))
  const result = move.contact && move.anchor ? tilt(built, move.anchor.at, move.contact.joint, move.contact.y) : built
  result.props = (move.props ?? []).flatMap((prop) => equipment(prop, result))
  return result
}

function asAngles(limb: Arm | Leg, base: Point, other: Arm | Leg, isLeg: boolean, len: Lengths): number[] {
  const near = (value: number, to: number) => value + 360 * Math.round((to - value) / 360)
  if (!isTarget(limb)) return limb
  const points = isLeg ? legPoints(base, limb as Leg, BODY.foot, len) : armPoints(base, limb as Arm, len)
  const angles = points.slice(1).map((p, i) => angleOf(points[i], p))
  if (isLeg) angles[2] = (limb as { foot?: number }).foot ?? 100
  return isTarget(other) ? angles : angles.map((a, i) => near(a, other[i]))
}

function blendLimb<T extends Arm | Leg>(a: T, b: T, k: number, from: [Point, Lengths], to: [Point, Lengths], isLeg: boolean): T {
  if (isTarget(a) && isTarget(b)) {
    const blended: Target & { foot?: number } = { at: lerpPoint(a.at, b.at, k), bend: k < 0.5 ? a.bend : b.bend }
    if (isLeg) blended.foot = turn((a as { foot?: number }).foot ?? 100, (b as { foot?: number }).foot ?? 100, k)
    return blended as T
  }
  const start = asAngles(a, from[0], b, isLeg, from[1])
  const end = asAngles(b, to[0], a, isLeg, to[1])
  return start.map((v, i) => turn(v, end[i], k)) as T
}

function blendScale(a: Pose['shorten'], b: Pose['shorten'], k: number): Pose['shorten'] {
  if (!a && !b) return undefined
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]) as Set<Segment>
  return Object.fromEntries([...keys].map((key) => [key, lerp(a?.[key] ?? 1, b?.[key] ?? 1, k)]))
}

/** The pose between `a` and `b` at progress `k` (0 to 1): planted hands and feet stay put, free limbs turn the short way. */
export function blend(move: Move, a: Pose, b: Pose, k: number): Pose {
  const front = move.view === 'front'
  const unlift = (p: Pose): Point => {
    const [x, y] = placeHip(move, p)
    return [x, y - (p.lift ?? 0)]
  }
  const ha = unlift(a)
  const hb = unlift(b)
  const sa = build(move, a, ha)
  const sb = build(move, b, hb)
  const la = limbs(a, front, joint(sa, 'hip')[0])
  const lb = limbs(b, front, joint(sb, 'hip')[0])
  const len = [lengths(a), lengths(b)] as const
  return {
    hip: lerpPoint(ha, hb, k),
    torso: turn(a.torso, b.torso, k),
    head: turn(a.head ?? a.torso, b.head ?? b.torso, k),
    spine: lerp(a.spine ?? 0, b.spine ?? 0, k),
    lift: lerp(a.lift ?? 0, b.lift ?? 0, k),
    grip: lerp(a.grip ?? 0, b.grip ?? 0, k),
    shorten: blendScale(a.shorten, b.shorten, k),
    arm: blendLimb(la.arm, lb.arm, k, [sa.arms[0][0], len[0]], [sb.arms[0][0], len[1]], false),
    farArm: blendLimb(la.farArm, lb.farArm, k, [sa.arms[1][0], len[0]], [sb.arms[1][0], len[1]], false),
    leg: blendLimb(la.leg, lb.leg, k, [sa.legs[0][0], len[0]], [sb.legs[0][0], len[1]], true),
    farLeg: blendLimb(la.farLeg, lb.farLeg, k, [sa.legs[1][0], len[0]], [sb.legs[1][0], len[1]], true),
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

/** The body's joints in a shape, without its equipment. */
export const bodyPoints = (s: Shape): Point[] => [s.head, ...s.neck, ...s.torso, ...s.arms.flat(), ...s.legs.flat()]

/** Every point a shape covers, for bounds and checks. */
export function shapePoints(s: Shape): Point[] {
  const props = s.props.flatMap((p) => (p.tone === 'wall' ? [] : 'points' in p ? p.points : [p.at]))
  return [...bodyPoints(s), ...props]
}

export const VIEW = { width: 2.6, height: 2.5, floor: 0.06 }

/** Horizontal centre of the move over a whole loop, so the camera never moves. */
export function centre(move: Move): number {
  const total = loopLength(move)
  const xs: number[] = []
  for (let i = 0; i <= 24; i++) for (const [x] of shapePoints(shape(move, poseAt(move, (total * i) / 24)))) xs.push(x)
  return (Math.min(...xs) + Math.max(...xs)) / 2
}

/** How far down the frame the top of the figure reaches over a loop, from 0 (top) to 1 (floor). */
export function headroom(move: Move): number {
  const known = rooms.get(move)
  if (known !== undefined) return known
  const total = loopLength(move)
  let top = 0
  for (let i = 0; i <= 24; i++) {
    const s = shape(move, poseAt(move, (total * i) / 24))
    top = Math.max(top, s.head[1] + BODY.head, ...shapePoints(s).map(([, y]) => y + 0.06))
  }
  const room = Math.max(0, (VIEW.height - VIEW.floor - top) / VIEW.height)
  rooms.set(move, room)
  return room
}

const rooms = new WeakMap<Move, number>()

const LIMB = 0.1

/** The pieces to draw for a shape, back to front; the count and order never change within a move. */
export function parts(s: Shape): Part[] {
  const far = s.front ? 'body' : 'far'
  const torso: Part = s.front ? { tone: 'body', width: LIMB, points: [...s.torso, s.torso[0]], fill: true } : { tone: 'body', width: 0.2, points: s.torso }
  const strip = ({ front, ...part }: Part & { front: boolean }): Part => (void front, part)
  return [
    ...s.props.filter((p) => !p.front).map(strip),
    { tone: far, width: LIMB, points: s.legs[1] },
    { tone: far, width: LIMB, points: s.arms[1] },
    torso,
    { tone: 'body', width: 0.09, points: s.neck },
    { tone: 'body', width: 0, at: s.head, r: BODY.head },
    { tone: 'body', width: LIMB, points: s.legs[0] },
    { tone: 'body', width: LIMB, points: s.arms[0] },
    ...s.props.filter((p) => p.front).map(strip),
  ]
}
