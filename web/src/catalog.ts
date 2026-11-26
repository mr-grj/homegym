import type { Arm, Leg, Move, Point, Pose } from './figure'

const at = (x: number, y = 0.07, foot?: number): Leg => ({ at: [x, y] as Point, ...(foot === undefined ? {} : { foot }) })
const hand = (x: number, y = 0.05, bend?: 1 | -1): Arm => ({ at: [x, y] as Point, ...(bend ? { bend } : {}) })
const rel = (torso: number, upper: number, fore: number): Arm => [torso + upper, torso + fore]
const FEET = at(0)
const STAND: Pose = { hip: [0, 0.95], torso: 0, arm: [180, 180], leg: FEET }
const HIPS = (torso: number) => rel(torso, 211, 132)

const squatDown = (arm: Arm): Pose => ({ hip: [-0.3, 0.47], torso: 38, arm, leg: FEET, hold: 250 })

const plankBody = { torso: 74, leg: [254, 254, 164] as Leg }

const halo = (near: Point, far: Point): Pose => ({ ...STAND, arm: hand(...near, -1), farArm: hand(...far, 1), leg: [180, 180, 110], grip: 0.5 })

const rowStance = { hip: [-0.05, 0.86] as Point, torso: 62, farArm: hand(0.22, 0.58), leg: at(-0.44), farLeg: at(0.3) }

const DOWN: Arm = [182, 178]
const CURLED: Arm = [182, 25]
const passCurl = (arm: Arm, farArm: Arm, grip: number, t: number, hold = 0): Pose => ({ ...STAND, arm, farArm, grip, t, hold })

const kneel: Leg = { at: [-0.39, 0.06], bend: 1, foot: 268 }

export const MOVES = {
  squat: {
    name: 'Bodyweight squat',
    poses: [{ ...STAND, arm: [175, 175], t: 1000 }, squatDown([88, 90])],
  },
  gobletSquat: {
    name: 'Goblet squat',
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { ...STAND, arm: [170, 15], t: 1400 },
      { ...squatDown([168, 20]), hip: [-0.27, 0.44], torso: 30 },
    ],
  },
  jumpSquat: {
    name: 'Jump squat',
    poses: [
      { ...squatDown([200, 200]), hold: 120, t: 380 },
      { hip: [0, 1.12], torso: 0, arm: [20, 10], leg: [180, 180, 120], hold: 60, t: 380 },
      { ...STAND, arm: [175, 175], hold: 0, t: 420 },
    ],
  },
  deepSquat: {
    name: 'Deep squat hold',
    poses: [{ hip: [-0.17, 0.27], torso: 28, arm: [140, 30], leg: FEET }],
  },
  hipHinge: {
    name: 'Hip hinge',
    poses: [
      { ...STAND, arm: HIPS(0), t: 1100 },
      { hip: [-0.27, 0.88], torso: 70, arm: HIPS(70), leg: FEET, hold: 300 },
    ],
  },
  romanianDeadlift: {
    name: 'Romanian deadlift',
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { ...STAND, t: 1300 },
      { hip: [-0.3, 0.87], torso: 72, arm: [180, 180], leg: FEET, hold: 250 },
    ],
  },
  dumbbellRomanianDeadlift: {
    name: 'Dumbbell Romanian deadlift',
    props: [{ kind: 'dumbbell', hand: 'near' }],
    poses: [
      { ...STAND, t: 1300 },
      { hip: [-0.3, 0.87], torso: 72, arm: [180, 180], leg: FEET, hold: 250 },
    ],
  },
  lunge: {
    name: 'Alternating lunge',
    poses: [
      { ...STAND, t: 900 },
      { hip: [0.42, 0.53], torso: 4, arm: [180, 180], leg: at(0.86), farLeg: at(-0.02, 0.16, 130), hold: 250 },
      { ...STAND, t: 900 },
      { hip: [0.42, 0.53], torso: 4, arm: [180, 180], leg: at(-0.02, 0.16, 130), farLeg: at(0.86), hold: 250 },
    ],
  },
  reverseLunge: {
    name: 'Reverse lunge',
    poses: [
      { ...STAND, t: 900 },
      { hip: [-0.42, 0.53], torso: 4, arm: [180, 180], leg: at(-0.86, 0.16, 130), farLeg: FEET, hold: 250 },
      { ...STAND, t: 900 },
      { hip: [-0.42, 0.53], torso: 4, arm: [180, 180], leg: FEET, farLeg: at(-0.86, 0.16, 130), hold: 250 },
    ],
  },
  dumbbellReverseLunge: {
    name: 'Dumbbell reverse lunge',
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { ...STAND, t: 900 },
      { hip: [-0.42, 0.53], torso: 4, arm: [180, 180], leg: at(-0.86, 0.16, 130), farLeg: FEET, hold: 250 },
      { ...STAND, t: 900 },
      { hip: [-0.42, 0.53], torso: 4, arm: [180, 180], leg: FEET, farLeg: at(-0.86, 0.16, 130), hold: 250 },
    ],
  },
  pushUp: {
    name: 'Push-up',
    anchor: { joint: 'toe', at: [-0.95, 0.02] },
    poses: [
      { torso: 73, arm: hand(0.35), leg: [253, 253, 163], t: 1000 },
      { torso: 83, arm: hand(0.35), leg: [263, 263, 173], hold: 200 },
    ],
  },
  plank: {
    name: 'Plank',
    anchor: { joint: 'toe', at: [-0.95, 0.02] },
    poses: [{ torso: 84.6, leg: [264.6, 264.6, 174.6], arm: [180, 90] }],
  },
  highPlank: {
    name: 'High plank',
    anchor: { joint: 'toe', at: [-0.95, 0.02] },
    poses: [{ ...plankBody, arm: hand(0.35) }],
  },
  sidePlank: {
    name: 'Side plank',
    view: 'front',
    side: 'left',
    narrow: true,
    anchor: { joint: 'toe', at: [-0.9, 0.03] },
    poses: [{ torso: 74.7, arm: [180, 90], farArm: [10, 10], leg: [254.7, 254.7, 164.7], farLeg: [254.7, 254.7, 164.7] }],
  },
  hollowHold: {
    name: 'Hollow hold',
    poses: [{ hip: [0, 0.1], torso: -72, head: -60, spine: -0.03, arm: [-70, -70], leg: [76, 76, 70] }],
  },
  deadBug: {
    name: 'Dead bug',
    beat: 1000,
    hold: 250,
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: [0, 0], leg: [0, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [-80, -80], farArm: [0, 0], leg: [0, 90, 20], farLeg: [80, 82, 30] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [0, 0], leg: [0, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [0, 0], farArm: [-80, -80], leg: [80, 82, 30], farLeg: [0, 90, 20] },
    ],
  },
  gluteBridge: {
    name: 'Glute bridge',
    anchor: { joint: 'shoulder', at: [-0.45, 0.1] },
    poses: [
      { torso: -90, head: -90, arm: [95, 92], leg: at(0.42), t: 900 },
      { torso: -135, head: -90, arm: [95, 92], leg: at(0.42), hold: 600 },
    ],
  },
  calfRaise: {
    name: 'Calf raise',
    poses: [
      { ...STAND, t: 800 },
      { ...STAND, hip: [0.065, 1.063], leg: at(0.065, 0.183, 140), hold: 600 },
    ],
  },
  mountainClimber: {
    name: 'Mountain climber',
    beat: 300,
    hold: 40,
    poses: [
      { hip: [-0.06, 0.5], torso: 72, arm: hand(0.42), leg: at(0.02, 0.15, 150), farLeg: at(-0.9, 0.2, 164) },
      { hip: [-0.06, 0.5], torso: 72, arm: hand(0.42), leg: at(-0.9, 0.2, 164), farLeg: at(0.02, 0.15, 150) },
    ],
  },
  burpee: {
    name: 'Burpee',
    hold: 60,
    beat: 380,
    poses: [
      { ...STAND, arm: [175, 175] },
      { hip: [-0.2, 0.46], torso: 50, arm: hand(0.42), leg: FEET, hold: 0 },
      { hip: [-0.1, 0.72], torso: 60, arm: hand(0.42), leg: at(-0.45, 0.35, 150), hold: 0, t: 220 },
      { hip: [-0.03, 0.47], torso: 74, arm: hand(0.42), leg: at(-0.876, 0.227, 164) },
      { hip: [-0.1, 0.72], torso: 60, arm: hand(0.42), leg: at(-0.45, 0.35, 150), hold: 0, t: 220 },
      { hip: [-0.2, 0.46], torso: 50, arm: hand(0.42), leg: FEET, hold: 0 },
      { hip: [0, 1.12], torso: 0, arm: [10, 5], leg: [180, 180, 120], hold: 80 },
    ],
  },
  standingBandRow: {
    name: 'Standing band row',
    props: [
      { kind: 'wall', x: 0.95 },
      { kind: 'band', from: 'hand', to: [0.95, 1.15] },
    ],
    poses: [
      { ...STAND, hip: [-0.03, 0.94], torso: 3, arm: [112, 104], t: 900 },
      { ...STAND, hip: [-0.03, 0.94], torso: 0, arm: [205, 95], hold: 400 },
    ],
  },
  seatedBandRow: {
    name: 'Seated band row',
    props: [{ kind: 'band', from: 'hand', to: 'foot' }],
    poses: [
      { hip: [0, 0.1], torso: 12, arm: [118, 112], leg: [90, 90, 10], t: 900 },
      { hip: [0, 0.1], torso: -2, arm: [200, 95], leg: [90, 90, 10], hold: 400 },
    ],
  },
  bandShoulderPress: {
    name: 'Band shoulder press',
    view: 'front',
    props: [
      { kind: 'band', from: 'foot', to: 'hand' },
      { kind: 'band', from: 'farFoot', to: 'farHand' },
    ],
    poses: [
      { ...STAND, arm: [125, 5], leg: [180, 180, 110], t: 900 },
      { ...STAND, arm: [10, 3], leg: [180, 180, 110], hold: 200 },
    ],
  },
  bandPullApart: {
    name: 'Band pull-apart',
    view: 'front',
    props: [{ kind: 'band', from: 'hand', to: 'farHand' }],
    poses: [
      { ...STAND, arm: [149, 303], leg: [180, 180, 110], t: 800 },
      { ...STAND, arm: [90, 90], leg: [180, 180, 110], hold: 300 },
    ],
  },
  armCircles: {
    name: 'Arm circles',
    ease: 'linear',
    cycle: true,
    hold: 0,
    beat: 450,
    key: 1,
    poses: [
      { ...STAND, arm: [180, 180] },
      { ...STAND, arm: [270, 270] },
      { ...STAND, arm: [360, 360] },
      { ...STAND, arm: [450, 450] },
      { ...STAND, arm: [540, 540] },
    ],
  },
  catCow: {
    name: 'Cat-cow',
    beat: 1400,
    hold: 300,
    poses: [
      { hip: [-0.1, 0.55], torso: 92, head: 140, spine: -0.09, arm: hand(0.4), leg: [180, 270, 270] },
      { hip: [-0.1, 0.55], torso: 88, head: 40, spine: 0.08, arm: hand(0.4), leg: [180, 270, 270] },
    ],
  },
  wallSlide: {
    name: 'Wall slide',
    view: 'front',
    beat: 1100,
    poses: [
      { ...STAND, arm: [100, 5], leg: [180, 180, 110] },
      { ...STAND, arm: [35, 20], leg: [180, 180, 110], hold: 300 },
    ],
  },
  quadStretch: {
    name: 'Standing quad stretch',
    poses: [{ ...STAND, arm: [80, 80], farArm: hand(-0.15, 0.97, 1), leg: FEET, farLeg: [205, 8, 275] }],
  },
  hamstringStretch: {
    name: 'Standing hamstring stretch',
    poses: [{ hip: [-0.15, 0.86], torso: 52, arm: hand(0.32, 0.42), leg: at(0.52, 0.08, 30), farLeg: FEET }],
  },
  calfStretch: {
    name: 'Calf stretch at the wall',
    props: [{ kind: 'wall', x: 0.72 }],
    poses: [{ hip: [-0.02, 0.86], torso: 22, arm: hand(0.69, 1.32, -1), leg: at(0.36), farLeg: at(-0.6) }],
  },
  hipFlexorStretch: {
    name: 'Half-kneeling hip flexor stretch',
    poses: [{ hip: [-0.05, 0.47], torso: -4, arm: HIPS(-4), leg: at(0.42), farLeg: [205, 270, 265] }],
  },
  jumpingJack: {
    name: 'Jumping jack',
    view: 'front',
    beat: 330,
    hold: 40,
    poses: [
      { hip: [0, 0.95], torso: 0, arm: [172, 178], leg: [180, 180, 110] },
      { hip: [0, 0.93], torso: 0, arm: [25, 15], leg: [158, 158, 110] },
    ],
  },
  highKnees: {
    name: 'High knees',
    beat: 250,
    hold: 30,
    poses: [
      { hip: [0, 0.99], torso: 0, arm: [215, 130], farArm: [150, 60], leg: [88, 180, 110], farLeg: [180, 180, 125] },
      { hip: [0, 0.99], torso: 0, arm: [150, 60], farArm: [215, 130], leg: [180, 180, 125], farLeg: [88, 180, 110] },
    ],
  },
  buttKicks: {
    name: 'Butt kicks',
    beat: 250,
    hold: 30,
    poses: [
      { hip: [0, 1.0], torso: 5, arm: [215, 130], farArm: [150, 60], leg: [190, 345, 300], farLeg: [180, 180, 120] },
      { hip: [0, 1.0], torso: 5, arm: [150, 60], farArm: [215, 130], leg: [180, 180, 120], farLeg: [190, 345, 300] },
    ],
  },
  skaterHops: {
    name: 'Skater hops',
    view: 'front',
    beat: 260,
    hold: 140,
    poses: [
      { hip: [0.38, 0.92], torso: 12, arm: [210, 200], farArm: [140, 120], leg: [168, 186, 110], farLeg: [150, 150, 120] },
      { hip: [0, 1.06], torso: 0, arm: [200, 190], farArm: [160, 170], leg: [175, 180, 130], farLeg: [185, 180, 230], hold: 0 },
      { hip: [-0.38, 0.92], torso: -12, arm: [220, 240], farArm: [150, 160], leg: [210, 210, 240], farLeg: [192, 174, 250] },
      { hip: [0, 1.06], torso: 0, arm: [200, 190], farArm: [160, 170], leg: [175, 180, 130], farLeg: [185, 180, 230], hold: 0 },
    ],
  },
  starJump: {
    name: 'Star jump',
    view: 'front',
    beat: 380,
    hold: 80,
    poses: [
      { hip: [0, 0.74], torso: 0, arm: [190, 175], leg: at(0.2), farLeg: at(-0.2) },
      { hip: [0, 1.15], torso: 0, arm: [45, 45], leg: [150, 150, 120] },
    ],
  },
  inchworm: {
    name: 'Inchworm',
    anchor: { joint: 'toe', at: [0.19, 0.04] },
    beat: 1000,
    hold: 200,
    poses: [
      { torso: 0, arm: [180, 180], leg: [180, 180, 100] },
      { torso: 135, head: 160, arm: hand(0.45, 0.03), leg: [180, 180, 100] },
      { torso: 74, arm: hand(1.46, 0.03), leg: [254, 254, 164] },
      { torso: 135, head: 160, arm: hand(0.45, 0.03), leg: [180, 180, 100] },
    ],
  },
  kettlebellSwing: {
    name: 'Kettlebell swing',
    props: [{ kind: 'kettlebell', hand: 'near', swing: true }],
    beat: 520,
    hold: 60,
    poses: [
      { hip: [-0.28, 0.85], torso: 62, arm: [196, 196], leg: FEET },
      { ...STAND, arm: [92, 92] },
    ],
  },
  kettlebellDeadlift: {
    name: 'Kettlebell deadlift',
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { hip: [-0.3, 0.62], torso: 52, arm: [180, 180], leg: FEET, t: 1000 },
      { ...STAND, hold: 300 },
    ],
  },
  dumbbellRow: {
    name: 'Bent-over dumbbell row',
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { hip: [-0.27, 0.87], torso: 70, arm: [180, 180], leg: FEET, t: 800 },
      { hip: [-0.27, 0.87], torso: 70, arm: [272, 182], leg: FEET, hold: 350 },
    ],
  },
  overheadPress: {
    name: 'Dumbbell overhead press',
    view: 'front',
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { ...STAND, arm: [125, 5], leg: [180, 180, 110], t: 900 },
      { ...STAND, arm: [10, 3], leg: [180, 180, 110], hold: 200 },
    ],
  },
  lateralRaise: {
    name: 'Lateral raise',
    view: 'front',
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { ...STAND, arm: [172, 175], leg: [180, 180, 110], t: 900 },
      { ...STAND, arm: [88, 92], leg: [180, 180, 110], hold: 250 },
    ],
  },
  bicepsCurl: {
    name: 'Biceps curl',
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { ...STAND, arm: [182, 178], t: 800 },
      { ...STAND, arm: [182, 25], hold: 250 },
    ],
  },
  thruster: {
    name: 'Dumbbell thruster',
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { ...squatDown([150, 0]), t: 700 },
      { ...STAND, arm: [2, 2], hold: 200 },
    ],
  },
  tricepsExtension: {
    name: 'Overhead triceps extension',
    props: [{ kind: 'dumbbell', hand: 'near' }],
    poses: [
      { ...STAND, arm: [-8, 200], t: 900 },
      { ...STAND, arm: [-8, -4], hold: 250 },
    ],
  },
  frontRaise: {
    name: 'Front raise',
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { ...STAND, arm: [175, 175], t: 900 },
      { ...STAND, arm: [92, 92], hold: 250 },
    ],
  },
  crunch: {
    name: 'Crunch',
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: rel(-90, 35, 160), leg: at(0.42), t: 800 },
      { hip: [0, 0.1], torso: -55, head: -40, spine: -0.05, arm: rel(-55, 35, 160), leg: at(0.42), hold: 300 },
    ],
  },
  sitUp: {
    name: 'Sit-up',
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: rel(-90, 150, 25), leg: at(0.42), t: 1000 },
      { hip: [0, 0.1], torso: 5, head: 15, spine: -0.04, arm: rel(5, 150, 25), leg: at(0.42), hold: 250 },
    ],
  },
  bicycleCrunch: {
    name: 'Bicycle crunch',
    beat: 650,
    hold: 120,
    poses: [
      { hip: [0, 0.1], torso: -62, head: -45, spine: -0.04, arm: rel(-62, 35, 160), leg: [30, 130, 80], farLeg: [78, 82, 60] },
      { hip: [0, 0.1], torso: -62, head: -45, spine: -0.04, arm: rel(-62, 35, 160), leg: [78, 82, 60], farLeg: [30, 130, 80] },
    ],
  },
  legRaise: {
    name: 'Leg raise',
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [88, 88, 70], t: 1000 },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [2, 2, -10], hold: 250 },
    ],
  },
  birdDog: {
    name: 'Bird dog',
    beat: 1000,
    hold: 400,
    poses: [
      { hip: [-0.1, 0.55], torso: 90, arm: hand(0.4), leg: [180, 270, 270] },
      { hip: [-0.1, 0.55], torso: 90, arm: [92, 92], farArm: hand(0.4), leg: [180, 270, 270], farLeg: [268, 268, 250] },
      { hip: [-0.1, 0.55], torso: 90, arm: hand(0.4), leg: [180, 270, 270] },
      { hip: [-0.1, 0.55], torso: 90, arm: hand(0.4), farArm: [92, 92], leg: [268, 268, 250], farLeg: [180, 270, 270] },
    ],
  },
  superman: {
    name: 'Superman',
    beat: 900,
    hold: 500,
    poses: [
      { hip: [0, 0.1], torso: 90, head: 92, arm: [90, 90], leg: [270, 270, 262] },
      { hip: [0, 0.1], torso: 72, head: 64, spine: 0.08, arm: [66, 66], leg: [290, 290, 282] },
    ],
  },
  flutterKicks: {
    name: 'Flutter kicks',
    beat: 260,
    hold: 20,
    poses: [
      { hip: [0, 0.1], torso: -84, head: -70, arm: [95, 92], leg: [68, 68, 60], farLeg: [80, 80, 72] },
      { hip: [0, 0.1], torso: -84, head: -70, arm: [95, 92], leg: [80, 80, 72], farLeg: [68, 68, 60] },
    ],
  },
  vUp: {
    name: 'V-up',
    beat: 700,
    hold: 150,
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: [-90, -90], leg: [90, 90, 75] },
      { hip: [0, 0.1], torso: -35, head: -20, spine: -0.03, arm: [55, 55], leg: [42, 42, 30] },
    ],
  },
  childsPose: {
    name: "Child's pose",
    poses: [{ hip: [-0.36, 0.24], torso: 104, head: 120, spine: -0.05, arm: [96, 92], leg: [112, 268, 268] }],
  },
  cobra: {
    name: 'Cobra',
    beat: 1500,
    hold: 900,
    poses: [
      { hip: [0, 0.09], torso: 88, head: 90, arm: hand(0.33, 0.03, -1), leg: [270, 270, 265] },
      { hip: [0, 0.09], torso: 55, head: 30, spine: 0.08, arm: hand(0.33, 0.03, -1), leg: [270, 270, 265] },
    ],
  },
  downwardDog: {
    name: 'Downward dog',
    poses: [{ hip: [0.02, 0.9], torso: 128, head: 150, arm: hand(0.72, 0.03), leg: at(-0.38, 0.07, 100) }],
  },
  pigeon: {
    name: 'Pigeon pose',
    poses: [{ hip: [0, 0.3], torso: 10, arm: hand(0.32, 0.03), leg: [105, 255, 265], farLeg: [256, 256, 262] }],
  },
  chestOpener: {
    name: 'Chest opener',
    beat: 1200,
    hold: 600,
    poses: [
      { ...STAND, arm: [195, 195] },
      { ...STAND, head: -15, spine: 0.05, arm: [235, 235] },
    ],
  },
  splitSquat: {
    name: 'Split squat',
    anchor: { joint: 'ankle', at: [0.3, 0.1] },
    poses: [
      { torso: 1, arm: [180, 180], leg: [125, 175, 95], farLeg: [209.5, 238.1, 140] },
      { torso: 2, arm: [180, 180], leg: [90.8, 181.2, 95], farLeg: [185, 285, 175] },
    ],
  },
  bulgarianSplitSquat: {
    name: 'Bulgarian split squat',
    anchor: { joint: 'ankle', at: [0.3, 0.1] },
    props: [{ kind: 'bench', at: [-0.6, 0.4], length: 0.5, angle: 90 }],
    poses: [
      { torso: 1, arm: [180, 180], leg: [182.1, 172, 95], farLeg: [221.1, 256, 255] },
      { torso: 4, arm: [180, 180], leg: [123.9, 166.5, 95], farLeg: [167, 297, 255] },
    ],
  },
  lateralLunge: {
    name: 'Lateral lunge',
    view: 'front',
    anchor: { joint: 'farAnkle', at: [-0.5, 0.1] },
    poses: [
      { torso: 0, arm: [160, 300], leg: [147.8, 157, 120], farLeg: [-140.5, -175, -120] },
      { torso: 8, arm: [160, 300], leg: [126.4, 203.1, 120], farLeg: [-145.8, -137.8, -120] },
    ],
  },
  curtsyLunge: {
    name: 'Curtsy lunge',
    view: 'front',
    anchor: { joint: 'ankle', at: [0.1, 0.1] },
    poses: [
      { torso: 0, arm: [160, 330], leg: [178, 180, 120] },
      { torso: 0, arm: [160, 330], leg: [192.4, 182, 120], farLeg: [-192.6, -208, -120], shorten: { thigh: 0.8 } },
    ],
  },
  pistolSquat: {
    name: 'Pistol squat',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    poses: [
      { torso: 0, arm: [90, 90], leg: [180, 180, 95], farLeg: [100, 100, 10] },
      { torso: 35, head: 20, arm: [85, 85], leg: [95, 212, 95], farLeg: [80, 80, 350] },
    ],
  },
  stepUp: {
    name: 'Step-up',
    anchor: { joint: 'ankle', at: [0.3, 0.5] },
    props: [{ kind: 'box', at: [0.3, 0], w: 0.5, h: 0.4 }],
    poses: [
      { torso: 8, arm: [180, 180], leg: [95.2, 202.1, 95], farLeg: [177, 193, 95] },
      { torso: 0, arm: [180, 180], leg: [180, 180, 95], farLeg: [178, 180, 95] },
    ],
  },
  singleLegGluteBridge: {
    name: 'Single-leg glute bridge',
    anchor: { joint: 'ankle', at: [0.5, 0.1] },
    contact: { joint: 'shoulder', y: 0.1 },
    poses: [
      { torso: 270, head: 270, arm: [90, 90], leg: [40, 150, 95], farLeg: [60, 60, 0] },
      { torso: 250, head: 265, arm: [80, 80], leg: [72, 168, 95], farLeg: [72, 72, 0] },
    ],
  },
  hipThrust: {
    name: 'Hip thrust',
    anchor: { joint: 'ankle', at: [0.5, 0.1] },
    props: [{ kind: 'bench', at: [-0.6, 0.4], length: 0.6, angle: 90 }],
    poses: [
      { torso: 302.6, head: 300, arm: [130, 130], leg: [51.5, 159.9, 95] },
      { torso: 265.4, head: 275, arm: [100, 100], leg: [93, 183.7, 95] },
    ],
  },
  singleLegDeadlift: {
    name: 'Single-leg deadlift',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    poses: [
      { torso: 0, arm: [180, 180], leg: [180, 180, 95], farLeg: [192, 192, 120] },
      { torso: 85, head: 75, arm: [180, 180], leg: [170, 186, 95], farLeg: [262, 264, 180] },
    ],
  },
  jumpingLunge: {
    name: 'Jumping lunge',
    anchor: { joint: 'hip', at: [0, 0.6] },
    poses: [
      { torso: 0, arm: [200, 200], farArm: [150, 120], leg: [97, 180, 95], farLeg: [191.5, 276.8, 175] },
      { torso: 0, arm: [60, 50], farArm: [40, 30], leg: [165, 200, 150], farLeg: [195, 215, 155], lift: 0.6 },
      { torso: 0, arm: [150, 120], farArm: [200, 200], leg: [191.5, 276.8, 175], farLeg: [97, 180, 95] },
      { torso: 0, arm: [40, 30], farArm: [60, 50], leg: [195, 215, 155], farLeg: [165, 200, 150], lift: 0.6 },
    ],
  },
  kneePushUp: {
    name: 'Knee push-up',
    anchor: { joint: 'knee', at: [-0.1, 0.1] },
    poses: [
      { torso: 58.1, arm: [187.3, 179.3], leg: [238.1, 285, 200] },
      { torso: 80.4, arm: [281.3, 167.5], leg: [260.4, 285, 200], shorten: { upper: 0.8 } },
    ],
  },
  inclinePushUp: {
    name: 'Incline push-up',
    anchor: { joint: 'toe', at: [-0.6, 0] },
    props: [{ kind: 'bench', at: [0.7, 0.5], length: 0.5, angle: 90 }],
    poses: [
      { torso: 51, arm: [163.4, 170.9], leg: [231, 231, 185] },
      { torso: 69.3, arm: [288.1, 151.7], leg: [249.3, 249.3, 185], shorten: { upper: 0.8 } },
    ],
  },
  declinePushUp: {
    name: 'Decline push-up',
    anchor: { joint: 'toe', at: [-0.6, 0.5] },
    props: [{ kind: 'box', at: [-0.6, 0], w: 0.4, h: 0.5 }],
    poses: [
      { torso: 92.5, arm: [186.2, 180.3], leg: [272.5, 272.5, 185] },
      { torso: 106.3, arm: [106.3, 231.3], leg: [286.3, 286.3, 185], shorten: { upper: 0.8 } },
    ],
  },
  handstandPushUp: {
    name: 'Handstand push-up',
    anchor: { joint: 'hand', at: [0, 0] },
    props: [{ kind: 'wall', x: 0.4 }],
    poses: [
      { torso: 192, head: 192, arm: [180, 180], leg: [12, 12, 15] },
      { torso: 182, head: 182, arm: [263, 180], leg: [2, 2, 5] },
    ],
  },
  benchDip: {
    name: 'Bench dip',
    anchor: { joint: 'hand', at: [-0.2, 0.5] },
    props: [{ kind: 'bench', at: [-0.5, 0.4], length: 0.6, angle: 90 }],
    poses: [
      { torso: 3, head: 3, arm: [192, 186], leg: [104, 135.4, 95] },
      { torso: 5, head: 5, arm: [240, 150], leg: [77.5, 140.9, 95] },
    ],
  },
  pullUp: {
    name: 'Pull-up',
    view: 'front',
    anchor: { joint: 'hand', at: [0.4, 2.05] },
    props: [{ kind: 'bar', at: [0, 2.05], half: 0.55 }],
    poses: [
      { torso: 0, arm: [25.4, 25.1], leg: [178, 184, 140] },
      { torso: 0, arm: [115.5, 355.2], leg: [176, 186, 140] },
    ],
  },
  invertedRow: {
    name: 'Inverted row',
    anchor: { joint: 'ankle', at: [1.1, 0.1] },
    props: [{ kind: 'bar', at: [0.05, 0.96], half: 0.3 }],
    poses: [
      { torso: 285.5, head: 285.5, arm: [23.5, 42.8], leg: [465.5, 465.5, 400.5] },
      { torso: 299.8, head: 299.8, arm: [103.5, 327.4], leg: [479.8, 479.8, 414.8] },
    ],
  },
  shoulderTaps: {
    name: 'Plank shoulder taps',
    anchor: { joint: 'toe', at: [-0.7, 0] },
    contact: { joint: 'farHand', y: 0 },
    poses: [
      { torso: 90, head: 90, arm: [180, 180], leg: [270, 270, 185] },
      { torso: 90, head: 90, arm: [140, 330], farArm: [180, 180], leg: [270, 270, 185] },
      { torso: 90, head: 90, arm: [180, 180], leg: [270, 270, 185] },
    ],
  },
  plankUpDown: {
    name: 'Plank up-down',
    anchor: { joint: 'hand', at: [0.3, 0.04] },
    poses: [
      { torso: 84.2, head: 84.2, arm: [180, 90], leg: [264.2, 264.2, 179.2] },
      { torso: 75.2, head: 75.2, arm: [158, 158], leg: [255.2, 255.2, 170.2] },
    ],
  },
  bearCrawl: {
    name: 'Bear crawl',
    anchor: { joint: 'hip', at: [0, 0.7] },
    poses: [
      { torso: 100, head: 90, arm: [171.2, 155.9], farArm: [203.1, 174.2], leg: [152.1, 250.8, 150], farLeg: [126.3, 231.1, 150] },
      { torso: 100, head: 90, arm: [203.1, 174.2], farArm: [171.2, 155.9], leg: [126.3, 231.1, 150], farLeg: [152.1, 250.8, 150] },
    ],
  },
  reversePlank: {
    name: 'Reverse plank',
    anchor: { joint: 'farAnkle', at: [0.8, 0.1] },
    poses: [
      { torso: 292, head: 302, arm: [179.7, 179.9], farArm: [179.7, 179.9], leg: [100.6, 123.7, 120] },
    ],
  },
  spidermanPushUp: {
    name: 'Spiderman push-up',
    anchor: { joint: 'farToe', at: [-0.6, 0] },
    contact: { joint: 'hand', y: 0 },
    poses: [
      { torso: 90, head: 90, arm: [180, 180], leg: [270, 270, 185] },
      { torso: 90, head: 90, arm: [250, 165], leg: [80, 250, 220], farLeg: [270, 270, 185] },
    ],
  },
  reverseCrunch: {
    name: 'Reverse crunch',
    anchor: { joint: 'shoulder', at: [-0.5, 0.1] },
    poses: [
      { torso: 270, head: 270, arm: [90, 90], leg: [2, 92, 40] },
      { torso: 238, head: 270, arm: [90, 90], leg: [318, 60, 10] },
    ],
  },
  hangingKneeRaise: {
    name: 'Hanging knee raise',
    anchor: { joint: 'hand', at: [0, 2.15] },
    props: [{ kind: 'bar', at: [0, 2.15] }],
    poses: [
      { torso: -4, head: -4, arm: [356, 356], leg: [180, 180, 150] },
      { torso: -14, head: -14, arm: [12, 12], leg: [30, 165, 130] },
    ],
  },
  hangingLegRaise: {
    name: 'Hanging leg raise',
    anchor: { joint: 'hand', at: [0, 2.15] },
    props: [{ kind: 'bar', at: [0, 2.15] }],
    poses: [
      { torso: -4, head: -4, arm: [356, 356], leg: [180, 180, 150] },
      { torso: -12, head: -12, arm: [10, 10], leg: [90, 90, 60] },
    ],
  },
  abRollout: {
    name: 'Ab wheel rollout',
    anchor: { joint: 'knee', at: [0, 0.1] },
    props: [{ kind: 'wheel' }],
    poses: [
      { torso: 68.7, head: 78.7, arm: [180, 180], leg: [150, 270, 250] },
      { torso: 78, head: 88, arm: [109.1, 109.1], leg: [258, 270, 250] },
    ],
  },
  sideBend: {
    name: 'Dumbbell side bend',
    view: 'front',
    anchor: { joint: 'hip', at: [0, 1] },
    props: [{ kind: 'dumbbell', hand: 'near' }],
    poses: [
      { torso: 0, head: 0, arm: [180, 180], farArm: [-180, -180], leg: [180, 180, 120] },
      { torso: 26, head: 26, arm: [190.4, 187.8], farArm: [-169.6, -172.2], leg: [180, 180, 120] },
    ],
  },
  shadowBoxing: {
    name: 'Shadow boxing',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    poses: [
      { torso: 5, head: 10, arm: [160, 18], leg: [165, 188, 95], farLeg: [198, 182, 110] },
      { torso: 10, head: 12, arm: [88, 90], farArm: [160, 18], leg: [165, 188, 95], farLeg: [198, 182, 110] },
    ],
  },
  upwardDog: {
    name: 'Upward dog',
    anchor: { joint: 'ankle', at: [-0.8, 0.1] },
    poses: [
      { torso: 88, head: 92, arm: [285.5, 137.5], leg: [266, 266, 265] },
      { torso: 38, head: 25, arm: [180, 180], leg: [263, 263, 265] },
    ],
  },
  sphinx: {
    name: 'Sphinx pose',
    anchor: { joint: 'hip', at: [0, 0.1] },
    poses: [
      { torso: 86, head: 90, arm: [108, 90], leg: [268, 268, 265] },
      { torso: 60, head: 50, arm: [178, 90], leg: [268, 268, 265] },
    ],
  },
  butterflyStretch: {
    name: 'Butterfly stretch',
    view: 'front',
    anchor: { joint: 'hip', at: [0, 0.17] },
    poses: [
      { torso: 0, arm: [185, 200], leg: [65, 245, 160], shorten: { thigh: 0.8 } },
      { torso: 0, arm: [180, 195], leg: [102, 270, 160], shorten: { thigh: 0.8 } },
    ],
  },
  lyingHamstringStretch: {
    name: 'Lying hamstring stretch',
    anchor: { joint: 'hip', at: [0, 0.1] },
    poses: [
      { torso: 270, head: 285, arm: [57.8, 57.8], leg: [15, 130, 60], farLeg: [90, 90, 5] },
      { torso: 270, head: 285, arm: [61.1, 61.1], leg: [5, 5, 90], farLeg: [90, 90, 5] },
    ],
  },
  tricepsStretch: {
    name: 'Overhead triceps stretch',
    view: 'front',
    anchor: { joint: 'hip', at: [0, 1] },
    poses: [
      { torso: 0, arm: [2, 2], farArm: [-180, -178], leg: [180, 180, 120] },
      { torso: 0, head: -8, arm: [345, 200], farArm: [-300, -10], leg: [180, 180, 120] },
    ],
  },
  sideStretch: {
    name: 'Standing side stretch',
    view: 'front',
    anchor: { joint: 'hip', at: [0, 1] },
    poses: [
      { torso: 0, arm: [8, 4], leg: [174, 182, 120] },
      { torso: -22, arm: [-18, -32], farArm: [-34, -48], leg: [174, 182, 120], hold: 900 },
    ],
  },
  runnersLunge: {
    name: "Runner's lunge",
    anchor: { joint: 'ankle', at: [0.3, 0.1] },
    poses: [{ torso: 80, head: 95, arm: hand(0.52, 0.05), leg: [97, 186, 95], farLeg: [246, 246, 160] }],
  },
  standingToeTouch: {
    name: 'Standing toe touch',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    poses: [
      { torso: 0, arm: [180, 180], leg: [180, 180, 95] },
      { torso: 125, head: 140, arm: [180, 180], leg: [168, 185, 95] },
    ],
  },
  ballCrunch: {
    name: 'Stability ball crunch',
    anchor: { joint: 'hip', at: [0.1, 0.7] },
    props: [{ kind: 'ball', at: [0, 0.3], r: 0.3 }],
    poses: [
      { torso: 268, head: 273, arm: [298, 163], leg: [136.3, 136.5, 95] },
      { torso: 312, head: 337, arm: [342, 207], leg: [136.3, 136.5, 95] },
    ],
  },
  ballBackExtension: {
    name: 'Stability ball back extension',
    anchor: { joint: 'hip', at: [0, 0.8] },
    props: [{ kind: 'ball', at: [0, 0.3], r: 0.3 }],
    poses: [
      { torso: 118, head: 122, arm: [278, 138], leg: [226, 226, 185] },
      { torso: 78, head: 75, arm: [238, 98], leg: [226, 226, 185] },
    ],
  },
  wallBall: {
    name: 'Wall ball',
    anchor: { joint: 'toe', at: [0.2, 0.1] },
    props: [{ kind: 'wall', x: 0.8 }, { kind: 'medball', hand: 'near' }],
    poses: [
      { torso: 0, arm: [168, 32], leg: [180, 180, 95] },
      { torso: 35, head: 15, arm: [150, 15], leg: [95, 210, 95] },
      { torso: -3, arm: [35, 30], leg: [180, 180, 140] },
      { torso: -3, arm: [30, 25], leg: [180, 180, 95] },
    ],
  },
  medBallSlam: {
    name: 'Medicine ball slam',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'medball', hand: 'near' }],
    poses: [
      { torso: -4, arm: [4, 2], leg: [178, 182, 125] },
      { torso: 62, head: 60, arm: [150, 150], leg: [115, 205, 95] },
    ],
  },
  benchPress: {
    name: 'Dumbbell bench press',
    anchor: { joint: 'hip', at: [0.2, 0.6] },
    props: [{ kind: 'bench', at: [-0.1, 0.5], length: 1.2, angle: 90 }, { kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 270, arm: [8, 4], leg: [105, 180, 95] },
      { torso: 270, arm: [100, 355], leg: [105, 180, 95], shorten: { upper: 0.7 } },
    ],
  },
  floorPress: {
    name: 'Floor press',
    anchor: { joint: 'hip', at: [0.2, 0.1] },
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { torso: 270, arm: [2, 0], farArm: [95, 92], leg: [35, 152, 95] },
      { torso: 270, arm: [106, 355], farArm: [95, 92], leg: [35, 152, 95], shorten: { upper: 0.7 } },
    ],
  },
  pullover: {
    name: 'Dumbbell pullover',
    anchor: { joint: 'hip', at: [0.2, 0.6] },
    props: [{ kind: 'bench', at: [-0.1, 0.5], length: 1.2, angle: 90 }, { kind: 'dumbbell', hand: 'near' }],
    poses: [
      { torso: 270, arm: [6, 2], leg: [105, 180, 95] },
      { torso: 270, arm: [258, 250], leg: [105, 180, 95] },
    ],
  },
  inclinePress: {
    name: 'Incline dumbbell press',
    anchor: { joint: 'hip', at: [0.2, 0.6] },
    props: [{ kind: 'bench', at: [0.1, 0.5], length: 0.5, angle: 90 }, { kind: 'bench', at: [-0.1, 0.7], length: 0.8, angle: 135 }, { kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 315, arm: [20, 18], leg: [105, 180, 95] },
      { torso: 315, arm: [134, 6], leg: [105, 180, 95], shorten: { upper: 0.7 } },
    ],
  },
  concentrationCurl: {
    name: 'Concentration curl',
    anchor: { joint: 'hip', at: [0, 0.5] },
    props: [{ kind: 'bench', at: [-0.1, 0.4], length: 0.7, angle: 90 }, { kind: 'dumbbell', hand: 'near' }],
    poses: [
      { torso: 38, head: 60, arm: [168, 174], farArm: [165, 125], leg: [88, 182, 95] },
      { torso: 38, head: 55, arm: [168, 40], farArm: [165, 125], leg: [88, 182, 95] },
    ],
  },
  skullCrusher: {
    name: 'Skull crusher',
    anchor: { joint: 'hip', at: [0, 0.6] },
    props: [{ kind: 'bench', at: [-0.2, 0.4], length: 1.2, angle: 90 }, { kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 270, head: 270, arm: [0, 0], leg: [95, 180, 95] },
      { torso: 270, head: 270, arm: [352, 238], leg: [95, 180, 95] },
    ],
  },
  kickback: {
    name: 'Triceps kickback',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 65, head: 75, arm: [222, 168], leg: [162, 195, 95] },
      { torso: 65, head: 75, arm: [228, 228], leg: [162, 195, 95] },
    ],
  },
  uprightRow: {
    name: 'Upright row',
    view: 'front',
    anchor: { joint: 'hip', at: [0, 1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 0, arm: [188, 182], leg: [180, 180, 120] },
      { torso: 0, arm: [122, 300], leg: [180, 180, 120] },
    ],
  },
  rearDeltFly: {
    name: 'Rear delt fly',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 72, head: 70, arm: [180, 175], leg: [165, 192, 95] },
      { torso: 72, head: 70, arm: [175, 170], leg: [165, 192, 95], shorten: { upper: 0.2, fore: 0.2 } },
    ],
  },
  shrug: {
    name: 'Dumbbell shrug',
    view: 'front',
    anchor: { joint: 'hip', at: [0, 1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 0, arm: [176, 178], leg: [180, 180, 120] },
      { torso: 0, arm: [176, 178], leg: [180, 180, 120], shorten: { torso: 1.2 } },
    ],
  },
  dumbbellSquat: {
    name: 'Dumbbell squat',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 0, arm: [180, 180], leg: [180, 180, 95] },
      { torso: 32, head: 15, arm: [178, 178], leg: [95, 210, 95] },
    ],
  },
  dumbbellDeadlift: {
    name: 'Dumbbell deadlift',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 60.8, head: 45, arm: [180, 180], leg: [100, 205, 95] },
      { torso: 0, arm: [180, 180], leg: [180, 180, 95] },
    ],
  },
  dumbbellLunge: {
    name: 'Dumbbell lunge',
    anchor: { joint: 'farToe', at: [0, 0] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 0, arm: [180, 180], leg: [180, 180, 95], farLeg: [180, 180, 95] },
      { torso: 2, arm: [180, 180], leg: [90, 180, 95], farLeg: [185, 285, 175] },
    ],
  },
  dumbbellStepUp: {
    name: 'Dumbbell step-up',
    anchor: { joint: 'ankle', at: [0.3, 0.5] },
    props: [{ kind: 'box', at: [0.3, 0], w: 0.5, h: 0.4 }, { kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 8, arm: [180, 180], leg: [95.2, 202.1, 95], farLeg: [177, 193, 95] },
      { torso: 0, arm: [180, 180], leg: [180, 180, 95], farLeg: [178, 180, 95] },
    ],
  },
  dumbbellClean: {
    name: 'Dumbbell clean',
    anchor: { joint: 'toe', at: [0.2, 0.1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 50, head: 40, arm: [180, 180], leg: [115, 200, 95] },
      { torso: -3, arm: [180, 180], leg: [180, 180, 150] },
      { torso: 5, arm: [160, 15], leg: [150, 205, 95] },
    ],
  },
  kettlebellSnatch: {
    name: 'Kettlebell snatch',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { torso: 60, head: 45, arm: [200, 200], farArm: [175, 175], leg: [140, 195, 95] },
      { torso: -4, arm: [130, 30], farArm: [180, 180], leg: [180, 180, 95] },
      { torso: -2, arm: [4, 2], farArm: [180, 180], leg: [180, 180, 95] },
    ],
  },
  renegadeRow: {
    name: 'Renegade row',
    anchor: { joint: 'toe', at: [-0.8, 0] },
    props: [{ kind: 'kettlebell', hand: 'both' }],
    poses: [
      { torso: 60.2, head: 65.2, arm: [160.2, 160.2], leg: [242.2, 242.2, 165.2] },
      { torso: 60.2, head: 65.2, arm: [255.2, 160.2], farArm: [160.2, 160.2], leg: [242.2, 242.2, 165.2] },
      { torso: 60.2, head: 65.2, arm: [160.2, 160.2], leg: [242.2, 242.2, 165.2] },
      { torso: 60.2, head: 65.2, arm: [160.2, 160.2], farArm: [255.2, 160.2], leg: [242.2, 242.2, 165.2] },
    ],
  },
  dumbbellCalfRaise: {
    name: 'Dumbbell calf raise',
    anchor: { joint: 'toe', at: [0.1, 0.1] },
    props: [{ kind: 'dumbbell', hand: 'both' }],
    poses: [
      { torso: 0, arm: [180, 180], leg: [180, 180, 95] },
      { torso: 0, arm: [180, 180], leg: [180, 180, 142] },
    ],
  },
  kettlebellClean: {
    name: 'Kettlebell clean',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { torso: 60, head: 45, arm: [200, 200], leg: [150, 195, 95] },
      { torso: 0, arm: [170, 15], leg: [180, 180, 95] },
    ],
  },
  kettlebellPress: {
    name: 'Kettlebell press',
    view: 'front',
    anchor: { joint: 'hip', at: [0, 1] },
    props: [{ kind: 'kettlebell', hand: 'both' }],
    poses: [
      { torso: 0, arm: [100, 8], leg: [180, 180, 120] },
      { torso: 0, arm: [12, 4], leg: [180, 180, 120] },
    ],
  },
  windmill: {
    name: 'Kettlebell windmill',
    view: 'front',
    anchor: { joint: 'ankle', at: [0.3, 0.1] },
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { torso: 0, head: 0, arm: [0, 0], farArm: [-180, -180], leg: [155.7, 176.2, 120], farLeg: [-155.7, -176.2, -240] },
      { torso: -55, head: -55, arm: [2, 2], farArm: [-185, -185], leg: [163.5, 163.7, 120], farLeg: [-129, -192.6, -240] },
    ],
  },
  turkishGetUp: {
    name: 'Turkish get-up',
    anchor: { joint: 'ankle', at: [0.5, 0.12] },
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { torso: 270, head: 272, arm: [0, 0], farArm: [270, 270], leg: [40, 150, 95], farLeg: [90, 90, 5] },
      { torso: 320, head: 330, arm: [0, 0], farArm: [195.6, 215], leg: [40, 150, 95], farLeg: [90, 90, 5] },
      { torso: 25, head: 15, arm: [2, 2], farArm: [180, 180], leg: [95, 210, 95] },
      { torso: 0, arm: [0, 0], farArm: [180, 180], leg: [180, 180, 95] },
    ],
  },
  kettlebellHighPull: {
    name: 'Kettlebell high pull',
    view: 'front',
    anchor: { joint: 'ankle', at: [0.3, 0.1] },
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { torso: 0, arm: [180, 216.9], farArm: [-180, -216.9], leg: [138, 192, 120] },
      { torso: 0, arm: [11, 223.3], leg: [165, 168, 120], shorten: { upper: 0.6 } },
    ],
  },
  bandCurl: {
    name: 'Band biceps curl',
    anchor: { joint: 'ankle', at: [0, 0.1] },
    props: [{ kind: 'band', from: [0, 0], to: 'hand' }, { kind: 'band', from: [0, 0], to: 'farHand' }],
    poses: [
      { torso: 0, arm: [178, 172], leg: [180, 180, 95] },
      { torso: 0, arm: [172, 22], farArm: [178, 172], leg: [180, 180, 95] },
      { torso: 0, arm: [178, 172], farArm: [172, 22], leg: [180, 180, 95] },
    ],
  },
  monsterWalk: {
    name: 'Band lateral walk',
    view: 'front',
    anchor: { joint: 'farAnkle', at: [-0.1, 0.1] },
    props: [{ kind: 'band', from: 'farFoot', to: 'foot' }],
    poses: [
      { torso: 0, arm: [175, 175], leg: [168, 185, 120], shorten: { thigh: 0.8 } },
      { torso: 0, arm: [175, 175], leg: [145, 165, 120], farLeg: [-168, -185, -120], shorten: { thigh: 0.8 } },
    ],
  },
  hipAbduction: {
    name: 'Standing hip abduction',
    view: 'front',
    anchor: { joint: 'farAnkle', at: [-0.1, 0.1] },
    poses: [
      { torso: 0, arm: [160, 330], leg: [178, 180, 120] },
      { torso: -5, arm: [160, 330], leg: [142, 142, 120], farLeg: [-178, -180, -120] },
    ],
  },
  sumoSquat: {
    name: 'Sumo squat',
    view: 'front',
    poses: [
      { hip: [0, 0.9], torso: 0, arm: [160, 300], leg: at(0.42, 0.07, 125), t: 1000 },
      { hip: [0, 0.56], torso: 0, arm: [160, 300], leg: at(0.42, 0.07, 125), hold: 250 },
    ],
  },
  wallSit: {
    name: 'Wall sit',
    props: [{ kind: 'wall', x: -0.24 }],
    poses: [{ hip: [-0.12, 0.51], torso: 0, arm: [90, 90], leg: [90, 180, 100] }],
  },
  boxJump: {
    name: 'Box jump',
    props: [{ kind: 'box', at: [0.62, 0], w: 0.5, h: 0.5 }],
    hold: 80,
    beat: 420,
    poses: [
      { hip: [-0.25, 0.52], torso: 38, arm: [215, 215], leg: FEET, hold: 150 },
      { hip: [0.25, 1.25], torso: 12, arm: [25, 20], leg: [165, 195, 130], hold: 0 },
      { hip: [0.42, 1.0], torso: 34, arm: [85, 85], leg: at(0.62, 0.57) },
      { hip: [0.62, 1.45], torso: 0, arm: [180, 180], leg: at(0.62, 0.57), hold: 300 },
      { hip: [0.15, 1.3], torso: 0, arm: [170, 170], leg: [185, 180, 130], hold: 0 },
      { ...STAND, hold: 0 },
    ],
  },
  tuckJump: {
    name: 'Tuck jump',
    hold: 60,
    beat: 330,
    poses: [
      { hip: [-0.22, 0.6], torso: 30, arm: [210, 210], leg: FEET },
      { hip: [0, 1.32], torso: 5, arm: [70, 60], leg: [55, 195, 150], hold: 80 },
      { ...STAND, arm: [175, 175], hold: 0 },
    ],
  },
  donkeyKicks: {
    name: 'Donkey kicks',
    beat: 650,
    hold: 200,
    poses: [
      { hip: [-0.1, 0.55], torso: 90, arm: hand(0.4), leg: [180, 270, 270] },
      { hip: [-0.1, 0.55], torso: 88, arm: hand(0.4), leg: [292, 25, 290], farLeg: [180, 270, 270] },
      { hip: [-0.1, 0.55], torso: 90, arm: hand(0.4), leg: [180, 270, 270] },
      { hip: [-0.1, 0.55], torso: 88, arm: hand(0.4), leg: [180, 270, 270], farLeg: [292, 25, 290] },
    ],
  },
  pikePushUp: {
    name: 'Pike push-up',
    poses: [
      { hip: [-0.02, 0.95], torso: 128, head: 150, arm: hand(0.62, 0.04), leg: at(-0.42, 0.07, 100), t: 950 },
      { hip: [0.06, 0.86], torso: 152, head: 168, arm: hand(0.62, 0.04), leg: at(-0.42, 0.07, 100), hold: 200 },
    ],
  },
  sealJacks: {
    name: 'Seal jacks',
    view: 'front',
    beat: 330,
    hold: 40,
    poses: [
      { hip: [0, 0.93], torso: 0, arm: [90, 90], leg: [158, 158, 110] },
      { hip: [0, 0.95], torso: 0, arm: [150, 300], leg: [180, 180, 110] },
    ],
  },
  singleArmRow: {
    name: 'Single-arm dumbbell row',
    props: [
      { kind: 'bench', at: [0.3, 0.45], length: 1.1 },
      { kind: 'dumbbell', hand: 'near' },
    ],
    poses: [
      { hip: [0.15, 0.95], torso: 82, arm: [180, 180], farArm: hand(0.68, 0.52), leg: at(-0.12, 0.07), farLeg: [180, 270, 270], t: 800 },
      { hip: [0.15, 0.95], torso: 82, arm: [262, 178], farArm: hand(0.68, 0.52), leg: at(-0.12, 0.07), farLeg: [180, 270, 270], hold: 350 },
    ],
  },
  facePull: {
    name: 'Band face pull',
    props: [
      { kind: 'wall', x: 0.95 },
      { kind: 'band', from: 'hand', to: [0.95, 1.6] },
    ],
    poses: [
      { ...STAND, arm: [72, 76], t: 850 },
      { ...STAND, arm: hand(0.12, 1.62, 1), hold: 400 },
    ],
  },
  bandChestPress: {
    name: 'Band chest press',
    props: [
      { kind: 'wall', x: -0.65 },
      { kind: 'band', from: [-0.65, 1.3], to: 'hand' },
    ],
    poses: [
      { ...STAND, torso: 6, arm: [205, 75], t: 800 },
      { ...STAND, torso: 6, arm: [92, 92], hold: 300 },
    ],
  },
  seatedForwardFold: {
    name: 'Seated forward fold',
    beat: 1500,
    hold: 1200,
    poses: [
      { hip: [0, 0.1], torso: 5, arm: [180, 180], leg: [90, 90, 10] },
      { hip: [0, 0.1], torso: 68, head: 95, spine: -0.05, arm: [100, 100], leg: [90, 90, 10] },
    ],
  },
  kneeToChest: {
    name: 'Knee to chest',
    beat: 1100,
    hold: 900,
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [90, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: hand(-0.08, 0.45, 1), leg: [-25, 70, 30], farLeg: [90, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [90, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: hand(-0.08, 0.45, 1), leg: [90, 90, 20], farLeg: [-25, 70, 30] },
    ],
  },
  crossBodyStretch: {
    name: 'Cross-body shoulder stretch',
    view: 'front',
    poses: [{ ...STAND, arm: [-84, -88], farArm: hand(-0.02, 1.4, -1), leg: [180, 180, 110] }],
  },
  legSwings: {
    name: 'Leg swings',
    beat: 650,
    hold: 40,
    poses: [
      { ...STAND, arm: HIPS(0), farArm: [120, 110], leg: [115, 115, 100], farLeg: FEET },
      { ...STAND, arm: HIPS(0), farArm: [120, 110], leg: [228, 228, 100], farLeg: FEET },
    ],
  },
  warriorTwo: {
    name: 'Warrior II',
    view: 'front',
    poses: [{ hip: [0.06, 0.74], torso: 0, arm: [90, 90], leg: at(0.6, 0.07, 110), farLeg: [-139, -139, -110] }],
  },
  treePose: {
    name: 'Tree pose',
    view: 'front',
    poses: [{ ...STAND, hip: [0.07, 0.95], arm: [15, 345], leg: [135, 265, 250], farLeg: [180, 180, -110] }],
  },
  toeTaps: {
    name: 'Lying toe taps',
    beat: 700,
    hold: 150,
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [0, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [56, 140, 60], farLeg: [0, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [0, 90, 20] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: [95, 92], leg: [0, 90, 20], farLeg: [56, 140, 60] },
    ],
  },
  hollowRocks: {
    name: 'Hollow rocks',
    beat: 450,
    hold: 40,
    poses: [
      { hip: [0, 0.1], torso: -64, head: -52, spine: -0.03, arm: [-58, -58], leg: [86, 86, 80] },
      { hip: [0, 0.1], torso: -82, head: -70, spine: -0.03, arm: [-76, -76], leg: [66, 66, 60] },
    ],
  },
  plankToDownDog: {
    name: 'Plank to downward dog',
    beat: 1000,
    hold: 300,
    poses: [
      { hip: [-0.13, 0.46], torso: 74, arm: hand(0.35, 0.05), leg: at(-0.95, 0.15, 150) },
      { hip: [-0.35, 0.8], torso: 125, head: 150, arm: hand(0.35, 0.05), leg: at(-0.9, 0.07, 110) },
    ],
  },
  toeTouchCrunch: {
    name: 'Toe touch crunch',
    beat: 700,
    hold: 200,
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: [-5, -5], leg: [3, 3, 95] },
      { hip: [0, 0.1], torso: -60, head: -45, spine: -0.04, arm: [20, 22], leg: [3, 3, 95] },
    ],
  },
  bridgeMarch: {
    name: 'Glute bridge march',
    anchor: { joint: 'hip', at: [0, 0.4] },
    poses: [
      { torso: 238.8, head: 265, arm: [80, 80], leg: [72, 180, 95] },
      { torso: 238.8, head: 265, arm: [80, 80], leg: [72, 180, 95], farLeg: [20, 120, 60] },
      { torso: 238.8, head: 265, arm: [80, 80], leg: [72, 180, 95] },
      { torso: 238.8, head: 265, arm: [80, 80], leg: [20, 120, 60], farLeg: [72, 180, 95] },
    ],
  },
  wallPushUp: {
    name: 'Wall push-up',
    anchor: { joint: 'toe', at: [-0.2, 0] },
    props: [{ kind: 'wall', x: 0.7 }],
    poses: [
      { torso: 18.6, arm: [93.4, 101.4], leg: [198.6, 198.6, 100] },
      { torso: 23.9, arm: [62, 122.1], leg: [203.9, 203.9, 100], shorten: { upper: 0.8 } },
    ],
  },
  runInPlace: {
    name: 'Running in place',
    anchor: { joint: 'hip', at: [0, 1] },
    poses: [
      { torso: 3, arm: [212, 125], farArm: [150, 55], leg: [104.3, 197.1, 125], farLeg: [165.1, 195.3, 125] },
      { torso: 3, arm: [150, 55], farArm: [212, 125], leg: [165.1, 195.3, 125], farLeg: [104.3, 197.1, 125] },
    ],
  },
  chairPose: {
    name: 'Chair pose',
    poses: [{ hip: [-0.24, 0.6], torso: 30, arm: [20, 20], leg: FEET }],
  },
  happyBaby: {
    name: 'Happy baby',
    beat: 1400,
    hold: 600,
    poses: [
      { hip: [0, 0.1], torso: -90, head: -90, arm: hand(0.12, 0.62, 1), leg: [-20, 0, 80] },
      { hip: [0, 0.1], torso: -90, head: -90, arm: hand(0.2, 0.6, 1), leg: [-5, 10, 85] },
    ],
  },
  crabWalk: {
    name: 'Crab walk',
    beat: 450,
    hold: 80,
    poses: [
      { hip: [0.05, 0.38], torso: -60, head: -45, arm: hand(-0.45, 0.04, 1), leg: at(0.55, 0.07), farLeg: at(0.4, 0.07) },
      { hip: [0.05, 0.4], torso: -60, head: -45, arm: hand(-0.45, 0.04, 1), leg: at(0.42, 0.07), farLeg: at(0.6, 0.07) },
    ],
  },
  shoulderCircles: {
    name: 'Shoulder circles',
    ease: 'linear',
    cycle: true,
    hold: 0,
    beat: 650,
    key: 1,
    poses: [
      { ...STAND, arm: [180, 352] },
      { ...STAND, arm: [90, 262] },
      { ...STAND, arm: [0, 172] },
      { ...STAND, arm: [-90, 82] },
      { ...STAND, arm: [-180, -8] },
    ],
  },
  scapularPushUp: {
    name: 'Scapular push-up',
    anchor: { joint: 'toe', at: [-0.95, 0.02] },
    beat: 650,
    hold: 400,
    poses: [
      { torso: 72.2, spine: 0.05, head: 80, arm: hand(0.35), leg: [252.2, 252.2, 162.2], shorten: { upper: 1.06 } },
      { torso: 76.8, spine: -0.03, head: 74, arm: hand(0.35), leg: [256.8, 256.8, 166.8], shorten: { upper: 0.7 } },
    ],
  },
  kettlebellHalo: {
    name: 'Kettlebell halo',
    view: 'front',
    props: [{ kind: 'kettlebell', hand: 'pass', upright: true }],
    ease: 'linear',
    hold: 0,
    beat: 600,
    key: 2,
    poses: [
      halo([0.05, 1.3], [-0.05, 1.3]),
      halo([0.25, 1.57], [0.25, 1.67]),
      halo([0.05, 1.77], [-0.05, 1.77]),
      halo([-0.25, 1.67], [-0.25, 1.57]),
      halo([0.05, 1.3], [-0.05, 1.3]),
      halo([-0.25, 1.67], [-0.25, 1.57]),
      halo([0.05, 1.77], [-0.05, 1.77]),
      halo([0.25, 1.57], [0.25, 1.67]),
    ],
  },
  kettlebellRow: {
    name: 'Single-arm kettlebell row',
    side: 'left',
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { ...rowStance, arm: [180, 180], t: 800 },
      { ...rowStance, arm: [250, 175], hold: 350 },
    ],
  },
  singleArmKettlebellPress: {
    name: 'Single-arm kettlebell press',
    view: 'front',
    side: 'left',
    anchor: { joint: 'hip', at: [0, 1] },
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { torso: 0, arm: [168, -12], farArm: [192, 186], leg: [180, 180, 120], t: 900 },
      { torso: 0, arm: [8, 4], farArm: [192, 186], leg: [180, 180, 120], hold: 300 },
    ],
  },
  kneelingKettlebellCurl: {
    name: 'Kneeling kettlebell biceps curl',
    props: [{ kind: 'kettlebell', hand: 'near' }],
    poses: [
      { hip: [0, 0.5], torso: 0, arm: [182, 178], leg: [180, 270, 265], t: 900 },
      { hip: [0, 0.5], torso: 0, arm: [182, 25], leg: [180, 270, 265], hold: 250 },
    ],
  },
  handToHandCurl: {
    name: 'Hand-to-hand kettlebell curl',
    side: 'left',
    props: [{ kind: 'kettlebell', hand: 'pass' }],
    poses: [
      passCurl(DOWN, DOWN, 0, 800, 200),
      passCurl(CURLED, DOWN, 0, 300, 100),
      passCurl(CURLED, CURLED, 0, 200, 80),
      passCurl(CURLED, CURLED, 1, 300),
      passCurl(DOWN, CURLED, 1, 800, 80),
      passCurl(DOWN, DOWN, 1, 800, 200),
      passCurl(DOWN, CURLED, 1, 300, 100),
      passCurl(CURLED, CURLED, 1, 200, 80),
      passCurl(CURLED, CURLED, 0, 300),
      passCurl(CURLED, DOWN, 0, 800, 80),
    ],
  },
  kettlebellPullover: {
    name: 'Kettlebell floor pullover',
    anchor: { joint: 'shoulder', at: [-0.45, 0.1] },
    props: [{ kind: 'kettlebell', hand: 'near', swing: true }],
    poses: [
      { torso: -90, head: -90, arm: [0, 0], leg: at(0.42), t: 1300 },
      { torso: -90, head: -90, arm: [-80, -70], leg: at(0.42), hold: 300, t: 1000 },
    ],
  },
  bandLateralRaise: {
    name: 'Band lateral raise',
    view: 'front',
    props: [
      { kind: 'band', from: 'foot', to: 'hand' },
      { kind: 'band', from: 'farFoot', to: 'farHand' },
    ],
    poses: [
      { ...STAND, arm: [172, 175], leg: [180, 180, 110], t: 900 },
      { ...STAND, arm: [88, 92], leg: [180, 180, 110], hold: 250 },
    ],
  },
  doorwayChestStretch: {
    name: 'Doorway chest stretch',
    side: 'left',
    props: [{ kind: 'wall', x: -0.075 }],
    beat: 1400,
    poses: [
      { hip: [0, 0.93], torso: 0, arm: { at: [-0.035, 1.7], bend: 1 }, leg: at(0.24), farLeg: at(-0.2), shorten: { upper: 0.12 }, hold: 500 },
      { hip: [0.1, 0.91], torso: 9, arm: { at: [-0.035, 1.7], bend: 1 }, leg: at(0.24), farLeg: at(-0.2), shorten: { upper: 0.72 }, hold: 1600 },
    ],
  },
  childsPoseLatStretch: {
    name: "Child's pose lat stretch",
    beat: 1500,
    poses: [
      { hip: [-0.22, 0.4], torso: 100, head: 115, arm: hand(0.66), leg: kneel, hold: 400 },
      { hip: [-0.36, 0.24], torso: 104, head: 120, spine: -0.05, arm: hand(0.66), leg: kneel, hold: 1500 },
    ],
  },
  bandBentOverRow: {
    name: 'Bent-over band row',
    props: [{ kind: 'band', from: [0.13, 0.03], to: 'hand' }],
    poses: [
      { hip: [-0.2, 0.84], torso: 48, arm: [180, 180], leg: FEET, t: 800 },
      { hip: [-0.2, 0.84], torso: 48, arm: [250, 175], leg: FEET, hold: 400 },
    ],
  },
  bandTricepsExtension: {
    name: 'Band overhead triceps extension',
    props: [{ kind: 'band', from: [-0.18, 0.03], to: 'hand' }],
    poses: [
      { hip: [0, 0.9], torso: 0, arm: [-8, 200], leg: at(0.2), farLeg: at(-0.25), t: 900 },
      { hip: [0, 0.9], torso: 0, arm: [-8, -4], leg: at(0.2), farLeg: at(-0.25), hold: 250 },
    ],
  },
} satisfies Record<string, Move>

export type MoveId = keyof typeof MOVES

/** Other names each demo answers to, matched exactly after normalising. */
export const ALIASES: Partial<Record<MoveId, string[]>> = {
  squat: ['squat', 'air squat', 'genuflexiune', 'genuflexiuni fără greutate', 'genuflexiune fără greutate'],
  gobletSquat: ['kettlebell goblet squat', 'genuflexiuni goblet'],
  jumpSquat: ['squat jump', 'genuflexiuni cu săritură', 'genuflexiune cu săritură'],
  deepSquat: ['deep squat'],
  hipHinge: ['hip hinges, flat back', 'bodyweight hip hinge', 'aplecări din șold', 'aplecări din șold, spatele drept', 'aplecare din șold', 'good morning'],
  romanianDeadlift: ['RDL', 'kettlebell Romanian deadlift', 'kettlebell RDL', 'îndreptări românești', 'îndreptare românească'],
  dumbbellRomanianDeadlift: ['dumbbell RDL'],
  lunge: ['lunge', 'forward lunge', 'alternating light lunges', 'alternating forward lunge', 'fandare', 'fandări', 'fandări alternative', 'fandări alternativ', 'fandări ușoare alternativ'],
  reverseLunge: ['back lunge', 'alternating reverse lunge', 'fandare înapoi', 'fandări înapoi'],
  dumbbellReverseLunge: ['reverse lunge with dumbbells'],
  pushUp: ['pushup', 'press-up', 'flotare', 'flotări', 'flotări clasice', 'wide push-up', 'diamond push-up', 'close-grip push-up', 'triceps push-up', 'flotări diamant', 'flotări largi'],
  plank: ['forearm plank', 'elbow plank', 'planșă'],
  highPlank: ['straight-arm plank', 'plank on hands'],
  sidePlank: ['forearm side plank', 'planșă laterală'],
  hollowHold: ['hollow body hold', 'hollow body'],
  deadBug: [],
  gluteBridge: ['hip bridge', 'banded glute bridge', 'pod fesier', 'ridicări de bazin'],
  calfRaise: ['standing calf raise', 'ridicări pe vârfuri', 'ridicare pe vârfuri', 'single-leg calf raise'],
  mountainClimber: ['alpinistul'],
  burpee: [],
  standingBandRow: ['band row', 'resistance band row', 'ramat cu bandă', 'ramat cu bandă elastică', 'ramat cu elastic'],
  seatedBandRow: ['seated resistance band row'],
  bandShoulderPress: ['band overhead press', 'shoulder press cu bandă'],
  bandPullApart: ['pull-apart', 'resistance band pull-apart', 'light band pull-apart'],
  armCircles: ['shoulder and arm circles', 'rotiri de brațe', 'rotiri de umeri și brațe'],
  catCow: ['cat-camel', 'pisică-vacă'],
  wallSlide: ['wall angel'],
  quadStretch: ['quad stretch', 'standing quadriceps stretch'],
  hamstringStretch: [],
  calfStretch: ['wall calf stretch', 'calf stretch'],
  hipFlexorStretch: ['kneeling hip flexor stretch', 'hip flexor stretch'],
  jumpingJack: [],
  highKnees: ['genunchi sus', 'alergare cu genunchii sus'],
  buttKicks: ['butt kickers', 'heel kicks'],
  skaterHops: ['skaters', 'skater jumps'],
  starJump: [],
  inchworm: ['inch worm'],
  kettlebellSwing: ['KB swing', 'Russian kettlebell swing', 'Russian swing', 'swing cu kettlebell'],
  kettlebellDeadlift: ['KB deadlift', 'kettlebell sumo deadlift'],
  dumbbellRow: ['bent-over row', 'dumbbell bent-over row', 'ramat cu gantere', 'ramat cu ganteră'],
  overheadPress: ['dumbbell shoulder press', 'overhead press', 'shoulder press', 'military press', 'împins deasupra capului'],
  lateralRaise: ['side raise', 'dumbbell lateral raise', 'ridicări laterale', 'ridicări laterale cu gantere'],
  bicepsCurl: ['bicep curl', 'dumbbell curl', 'dumbbell biceps curl', 'flexii biceps', 'flexii cu gantere', 'hammer curl', 'Zottman curl', 'alternating curl', 'alternating dumbbell curl', 'flexii ciocan'],
  thruster: ['thruster'],
  tricepsExtension: ['overhead tricep extension', 'dumbbell overhead triceps extension'],
  frontRaise: ['dumbbell front raise', 'ridicări frontale'],
  crunch: ['abdomene'],
  sitUp: ['situp', 'ridicări de trunchi'],
  bicycleCrunch: [],
  legRaise: ['lying leg raise', 'ridicări de picioare'],
  birdDog: [],
  superman: ['superman hold'],
  flutterKicks: ['scissor kicks'],
  vUp: ['jackknife', 'jackknife sit-up'],
  childsPose: ['child pose', 'balasana'],
  cobra: ['cobra pose', 'cobra stretch'],
  downwardDog: ['downward-facing dog', 'down dog', 'câine cu fața în jos'],
  pigeon: ['pigeon', 'pigeon stretch'],
  chestOpener: ['standing chest stretch'],
  splitSquat: ['static lunge', 'stationary lunge', 'fandări statice'],
  bulgarianSplitSquat: ['rear-foot-elevated split squat', 'genuflexiuni bulgărești', 'fandări bulgărești'],
  lateralLunge: ['side lunge', 'fandări laterale', 'fandare laterală'],
  curtsyLunge: ['curtsy squat', 'fandări încrucișate'],
  pistolSquat: ['pistol', 'single-leg squat', 'genuflexiune pe un picior'],
  stepUp: ['box step-up', 'urcări pe treaptă', 'urcări pe bancă'],
  singleLegGluteBridge: ['single-leg bridge', 'one-leg glute bridge', 'pod fesier pe un picior'],
  hipThrust: ['bench hip thrust', 'glute thrust', 'ridicări de bazin pe bancă'],
  singleLegDeadlift: ['single-leg RDL', 'single-leg Romanian deadlift', 'one-leg deadlift', 'îndreptări pe un picior'],
  jumpingLunge: ['jump lunge', 'lunge jump', 'split jump', 'fandări cu săritură'],
  kneePushUp: ['knee pushup', 'kneeling push-up', 'modified push-up', 'flotări pe genunchi'],
  inclinePushUp: ['incline pushup', 'flotări înclinate'],
  declinePushUp: ['decline pushup', 'feet-elevated push-up', 'flotări declinate'],
  handstandPushUp: ['HSPU', 'wall handstand push-up'],
  benchDip: ['chair dip', 'flotări la bancă', 'flotări triceps'],
  pullUp: ['pullup', 'chin-up', 'chinup', 'tracțiuni', 'tracțiuni la bară'],
  invertedRow: ['Australian pull-up', 'table row', 'bodyweight row', 'ramat inversat'],
  shoulderTaps: ['shoulder taps', 'plank taps'],
  plankUpDown: ['up-down plank', 'commando plank', 'plank walk-up'],
  bearCrawl: ['bear walk'],
  reversePlank: ['back plank', 'planșă inversă'],
  spidermanPushUp: ['spider-man push-up', 'spiderman pushup'],
  reverseCrunch: ['abdomene inverse'],
  hangingKneeRaise: ['hanging knee tuck', 'ridicări de genunchi la bară'],
  hangingLegRaise: ['ridicări de picioare la bară'],
  abRollout: ['ab rollout', 'ab wheel', 'rollout', 'roata abdominală'],
  sideBend: ['side bend', 'aplecări laterale'],
  shadowBoxing: ['jab cross', 'punches', 'box în gol'],
  upwardDog: ['upward-facing dog', 'up dog', 'câine cu fața în sus'],
  sphinx: ['sphinx'],
  butterflyStretch: ['butterfly', 'butterfly pose', 'bound angle pose', 'fluturele'],
  lyingHamstringStretch: ['supine hamstring stretch'],
  tricepsStretch: ['triceps stretch'],
  sideStretch: ['side stretch', 'standing lateral stretch'],
  runnersLunge: ["runner's stretch", 'low lunge stretch'],
  standingToeTouch: ['standing forward fold', 'forward fold'],
  ballCrunch: ['ball crunch', 'swiss ball crunch', 'exercise ball crunch'],
  ballBackExtension: ['ball back extension', 'swiss ball back extension'],
  wallBall: ['wall ball shot'],
  medBallSlam: ['ball slam', 'slam ball', 'med ball slam'],
  benchPress: ['bench press', 'dumbbell chest press', 'împins la piept cu gantere'],
  floorPress: ['dumbbell floor press', 'kettlebell floor press'],
    pullover: ['pullover'],
  inclinePress: ['incline press', 'incline bench press', 'incline dumbbell bench press'],
  concentrationCurl: ['seated concentration curl'],
  skullCrusher: ['lying triceps extension'],
  kickback: ['dumbbell kickback'],
  uprightRow: ['dumbbell upright row'],
  rearDeltFly: ['reverse fly', 'bent-over reverse fly', 'rear delt raise', 'fluturări inverse'],
  shrug: ['shrug', 'ridicări din umeri'],
  dumbbellSquat: ['genuflexiuni cu gantere'],
  dumbbellDeadlift: ['îndreptări cu gantere'],
  dumbbellLunge: ['fandări cu gantere'],
  dumbbellStepUp: ['weighted step-up'],
  dumbbellClean: ['dumbbell power clean'],
  kettlebellSnatch: ['KB snatch'],
  renegadeRow: ['plank row'],
  dumbbellCalfRaise: ['weighted calf raise'],
  kettlebellClean: ['KB clean'],
  kettlebellPress: ['KB press', 'kettlebell overhead press', 'kettlebell shoulder press'],
  windmill: ['windmill', 'KB windmill'],
  turkishGetUp: ['TGU', 'get-up', 'Turkish getup'],
  kettlebellHighPull: ['sumo high pull', 'kettlebell sumo high pull', 'KB high pull'],
  bandCurl: ['band curl', 'resistance band curl'],
  monsterWalk: ['monster walk', 'lateral band walk', 'band walk', 'banded side step', 'mers lateral cu bandă'],
  hipAbduction: ['standing leg abduction', 'standing side leg raise'],
  sumoSquat: ['wide squat', 'plié squat', 'genuflexiuni sumo'],
  wallSit: ['wall squat', 'scaunul la perete', 'scaun la perete'],
  boxJump: ['sărituri pe cutie'],
  tuckJump: ['knee tuck jump'],
  donkeyKicks: ['donkey kick', 'glute kickback', 'quadruped kickback'],
  pikePushUp: ['pike pushup', 'pike press'],
  sealJacks: ['seal jack'],
  singleArmRow: ['single-arm row', 'one-arm dumbbell row', 'one-arm row', 'ramat cu o mână'],
  facePull: ['face pull'],
  bandChestPress: ['resistance band chest press'],
  seatedForwardFold: ['seated hamstring stretch', 'seated toe touch', 'paschimottanasana'],
  kneeToChest: ['knee to chest stretch', 'knees to chest', 'genunchi la piept'],
  crossBodyStretch: ['cross-body stretch', 'shoulder stretch', 'cross arm stretch'],
  legSwings: ['leg swing'],
  warriorTwo: ['warrior 2', 'warrior two', 'virabhadrasana II'],
  treePose: ['tree', 'vrksasana'],
  toeTaps: [],
  hollowRocks: ['hollow rock', 'hollow body rocks'],
  plankToDownDog: ['plank to down dog', 'plank to pike'],
  toeTouchCrunch: ['lying toe touch', 'toe reach crunch'],
  bridgeMarch: ['marching glute bridge', 'bridge march'],
  wallPushUp: ['wall pushup', 'flotări la perete'],
  runInPlace: ['run in place', 'jog in place', 'jogging in place', 'alergare pe loc'],
  chairPose: ['chair pose', 'utkatasana'],
  happyBaby: ['happy baby pose'],
  crabWalk: ['crab walks'],
  shoulderCircles: ['shoulder circles and rolls', 'elbow circles', 'rotiri de umeri'],
  scapularPushUp: ['scap push-up', 'scapula push-up', 'plank scapular push-up'],
  kettlebellHalo: ['halo', 'KB halo', 'halo cu kettlebell'],
  kettlebellRow: ['one-arm kettlebell row', 'single-arm KB row'],
  singleArmKettlebellPress: ['one-arm kettlebell press', 'single-arm kettlebell overhead press', 'single-arm KB press'],
  kneelingKettlebellCurl: ['kneeling kettlebell curl', 'tall-kneeling kettlebell curl'],
  handToHandCurl: ['kettlebell hand-to-hand curl'],
  kettlebellPullover: ['kettlebell pullover', 'floor pullover'],
  bandLateralRaise: ['resistance band lateral raise', 'ridicări laterale cu bandă'],
  doorwayChestStretch: ['doorway pec stretch', 'doorway pectoral stretch', 'doorway stretch'],
  bandBentOverRow: ['band bent-over row', 'bent-over resistance band row', 'ramat aplecat cu bandă'],
  bandTricepsExtension: ['resistance band overhead triceps extension', 'overhead band triceps extension', 'band triceps extension', 'extensii triceps cu bandă'],
  childsPoseLatStretch: ["child's pose side stretch", 'lateral child pose', "child's pose side reach"],
}
