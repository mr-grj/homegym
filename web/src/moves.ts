import type { Arm, Leg, Move, Point, Pose } from './figure'
import { fold } from './routine'
import type { Run } from './timer'

const at = (x: number, y = 0.07, foot?: number): Leg => ({ at: [x, y] as Point, ...(foot === undefined ? {} : { foot }) })
const hand = (x: number, y = 0.05, bend?: 1 | -1): Arm => ({ at: [x, y] as Point, ...(bend ? { bend } : {}) })
const rel = (torso: number, upper: number, fore: number): Arm => [torso + upper, torso + fore]
const FEET = at(0)
const STAND: Pose = { hip: [0, 0.95], torso: 0, arm: [180, 180], leg: FEET }
const HIPS = (torso: number) => rel(torso, 211, 132)

const squatDown = (arm: Arm): Pose => ({ hip: [-0.3, 0.47], torso: 38, arm, leg: FEET, hold: 250 })

const plankBody = { torso: 74, leg: [254, 254, 164] as Leg }

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
    poses: [{ torso: 79, leg: [259, 259, 169], arm: [180, 90] }],
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
    poses: [{ torso: 70, arm: [180, 90], farArm: [10, 10], leg: [250, 250, 160], farLeg: [250, 250, 160] }],
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
} satisfies Record<string, Move>

export type MoveId = keyof typeof MOVES

const ALIASES: Record<MoveId, string[]> = {
  squat: ['squat', 'air squat', 'genuflexiune', 'genuflexiuni fără greutate', 'genuflexiune fără greutate'],
  gobletSquat: ['kettlebell goblet squat', 'genuflexiuni goblet'],
  jumpSquat: ['squat jump', 'genuflexiuni cu săritură', 'genuflexiune cu săritură'],
  deepSquat: ['deep squat'],
  hipHinge: ['hip hinges, flat back', 'bodyweight hip hinge', 'aplecări din șold', 'aplecări din șold, spatele drept', 'aplecare din șold'],
  romanianDeadlift: ['RDL', 'kettlebell Romanian deadlift', 'kettlebell RDL', 'îndreptări românești', 'îndreptare românească'],
  dumbbellRomanianDeadlift: ['dumbbell RDL'],
  lunge: ['lunge', 'forward lunge', 'alternating light lunges', 'alternating forward lunge', 'fandare', 'fandări', 'fandări alternative', 'fandări alternativ', 'fandări ușoare alternativ'],
  reverseLunge: ['back lunge', 'alternating reverse lunge', 'fandare înapoi', 'fandări înapoi'],
  dumbbellReverseLunge: ['reverse lunge with dumbbells'],
  pushUp: ['pushup', 'press-up', 'flotare', 'flotări', 'flotări clasice'],
  plank: ['forearm plank', 'elbow plank', 'planșă'],
  highPlank: ['straight-arm plank', 'plank on hands'],
  sidePlank: ['forearm side plank', 'planșă laterală'],
  hollowHold: ['hollow body hold', 'hollow body'],
  deadBug: [],
  gluteBridge: ['hip bridge', 'pod fesier', 'ridicări de bazin'],
  calfRaise: ['standing calf raise', 'ridicări pe vârfuri', 'ridicare pe vârfuri'],
  mountainClimber: ['alpinistul'],
  burpee: [],
  standingBandRow: ['band row', 'resistance band row', 'ramat cu bandă', 'ramat cu bandă elastică', 'ramat cu elastic'],
  seatedBandRow: ['seated resistance band row'],
  bandShoulderPress: ['band overhead press', 'shoulder press cu bandă'],
  bandPullApart: ['pull-apart'],
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
  kettlebellDeadlift: ['KB deadlift'],
  dumbbellRow: ['bent-over row', 'dumbbell bent-over row', 'ramat cu gantere', 'ramat cu ganteră'],
  overheadPress: ['dumbbell shoulder press', 'overhead press', 'shoulder press', 'military press', 'împins deasupra capului'],
  lateralRaise: ['side raise', 'dumbbell lateral raise', 'ridicări laterale', 'ridicări laterale cu gantere'],
  bicepsCurl: ['bicep curl', 'dumbbell curl', 'dumbbell biceps curl', 'flexii biceps', 'flexii cu gantere'],
  thruster: ['thruster'],
  tricepsExtension: ['overhead tricep extension', 'dumbbell overhead triceps extension'],
  frontRaise: ['dumbbell front raise', 'ridicări frontale'],
  crunch: ['abdomene'],
  sitUp: ['situp', 'ridicări de trunchi'],
  bicycleCrunch: [],
  legRaise: ['lying leg raise', 'ridicări de picioare'],
  birdDog: [],
  superman: ['superman hold'],
  flutterKicks: [],
  vUp: [],
  childsPose: ['child pose', 'balasana'],
  cobra: ['cobra pose', 'cobra stretch'],
  downwardDog: ['downward-facing dog', 'down dog', 'câine cu fața în jos'],
  pigeon: ['pigeon', 'pigeon stretch'],
  chestOpener: ['standing chest stretch'],
}

const SIDES: Record<string, 'left' | 'right'> = { left: 'left', right: 'right', stanga: 'left', dreapta: 'right' }

const singular = (word: string) => (word.length > 2 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word)

/** Reduce an exercise name to its matching key and the side it names, if any. */
export function moveKey(label: string): { key: string; side: 'left' | 'right' | null } {
  const words = fold(label)
    .trim()
    .replace(/['’]/g, '')
    .replace(/^\d+\s*(?:x|×|reps?)\s+/, '')
    .replace(/\s+(?:(?:x|×)\s*\d+|\d+\s*reps?)$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  let side: 'left' | 'right' | null = null
  if (words.length > 1 && SIDES[words.at(-1)!]) side = SIDES[words.pop()!]
  else if (words.length > 1 && SIDES[words[0]]) side = SIDES[words.shift()!]
  return { key: words.map(singular).join(' '), side }
}

const INDEX = new Map<string, MoveId>()
for (const [id, move] of Object.entries(MOVES) as [MoveId, Move][])
  for (const name of [move.name, ...ALIASES[id]]) INDEX.set(moveKey(name).key, id)

/** Every name that leads to a demo, for tests. */
export const allNames = () => (Object.entries(MOVES) as [MoveId, Move][]).flatMap(([id, move]) => [move.name, ...ALIASES[id]].map((name) => ({ id, name })))

/** Demo names offered as builder suggestions. */
export const CATALOG = (Object.values(MOVES) as Move[]).map((move) => move.name)

export type Demo = { id: MoveId; move: Move; mirror: boolean }

const found = new Map<string, Demo | null>()

/** The demo for an exercise name: exact match on a known name only, never a guess. */
export function moveFor(label: string): Demo | null {
  if (found.has(label)) return found.get(label)!
  const { key, side } = moveKey(label)
  const id = INDEX.get(key)
  const move: Move | undefined = id && MOVES[id]
  const demo = id && move ? { id, move, mirror: side !== null && side !== (move.side ?? 'right') } : null
  found.set(label, demo)
  return demo
}

/** The step to demonstrate now: the current exercise, or during a rest the next one; null when finished. */
export function demoStep(run: Run) {
  if (run.finishedAt) return null
  const step = run.steps[run.index]
  return step.rest ? (run.steps.slice(run.index + 1).find((s) => !s.rest) ?? null) : step
}
