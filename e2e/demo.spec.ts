import type { Page } from '@playwright/test'
import { addRoutine, enter, expect, shortcut, test } from './fixtures'

const demo = (page: Page) => page.locator('.demo')
const pose = (page: Page) => page.locator('.demo > g:last-of-type').innerHTML()

test('the figure shows the exercise, previews the next one during a rest and follows the timer', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Full Body' }).click()
  await expect(demo(app)).toHaveAttribute('data-move', 'catCow')
  await expect(demo(app)).toHaveAttribute('data-playing')
  await expect(demo(app)).not.toHaveAttribute('data-dim')

  await shortcut(app, 'Space')
  await expect(app.locator('.prep-cue')).toBeVisible()
  await expect(demo(app)).not.toHaveAttribute('data-playing')
  const start = await pose(app)
  await app.clock.runFor(2000)
  await expect.poll(() => pose(app)).toBe(start)
  await app.clock.runFor(3500)
  await expect(demo(app)).toHaveAttribute('data-playing')
  await expect.poll(() => pose(app)).not.toBe(start)

  for (let i = 0; i < 6; i++) await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Switch')
  await expect(demo(app)).toHaveAttribute('data-move', 'pushUp')
  await expect(demo(app)).toHaveAttribute('data-dim')
  await expect(app.locator('.demo-cue')).toHaveText('Up next')

  await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Push-ups')
  await expect(demo(app)).toHaveAttribute('data-move', 'pushUp')
  await expect(demo(app)).not.toHaveAttribute('data-dim')
  await expect(app.locator('.demo-over')).toHaveCount(0)

  await shortcut(app, 'Space')
  await expect(demo(app)).not.toHaveAttribute('data-playing')
  const paused = await pose(app)
  await app.clock.runFor(2000)
  await expect.poll(() => pose(app)).toBe(paused)
})

test('technique hints: setup before an exercise, form while it runs, next to a note', async ({ app }) => {
  const hint = app.locator('.demo-hint')
  await app.locator('.chip-main', { hasText: 'Full Body' }).click()
  await expect(hint).toHaveText('Hands under shoulders, knees under hips')

  await shortcut(app, 'Space')
  await expect(app.locator('.prep-cue')).toBeVisible()
  await expect(hint).toHaveText('Hands under shoulders, knees under hips')
  await app.clock.runFor(5500)
  await expect(hint).toHaveText('Exhale to round, then let the belly drop')
  await shortcut(app, 'Space')
  await expect(hint).toHaveText('Exhale to round, then let the belly drop')
  await shortcut(app, 'Space')

  for (let i = 0; i < 5; i++) await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Kettlebell swing')
  await expect(app.locator('.note')).toBeVisible()
  await expect(hint).toHaveText('Feet shoulder-width, hinge at the hips')
  await app.clock.runFor(5500)
  await expect(hint).toHaveText('Snap hips forward, arms just guide')

  await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Switch')
  await expect(hint).toHaveText('Body in one line from head to heels')
  await shortcut(app, 'd')
  await expect(hint).toHaveCount(0)
})

test('the hint line is kept for the whole run and fits a small phone', async ({ app }) => {
  await app.setViewportSize({ width: 320, height: 640 })
  await app.locator('.chip-main', { hasText: 'Full Body' }).click()
  await expect(app.locator('.demo-slot')).toHaveAttribute('data-hinted')
  const layout = async () => {
    const slot = (await app.locator('.demo-slot').boundingBox())!
    const time = (await app.locator('.time').boundingBox())!
    return { slot: slot.height, gap: time.y - slot.y, time: time.height }
  }
  const first = await layout()
  for (const label of ['Cat-cow', 'Bodyweight squats', 'Hip hinges, flat back', 'Shoulder and arm circles', 'Inchworms']) {
    await expect(app.locator('.label')).toHaveText(label)
    await expect(demo(app)).toBeVisible()
    const box = (await app.locator('.demo-hint').boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
    expect(box.height).toBeLessThan(22)
    expect(await layout()).toEqual(first)
    await shortcut(app, 'ArrowRight')
  }
  expect(await app.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
})

test('unknown exercises show nothing and the clock never moves', async ({ app }) => {
  await app.setViewportSize({ width: 390, height: 844 })
  await addRoutine(app, '# Cool-down stretch\n\n## Legs\nStanding quad stretch 45s\nStanding hamstring stretch 45s\nCalf stretch at the wall 45s\nHalf-kneeling hip flexor stretch 45s\n\n## Free stretching\nAnything that feels tight\n')
  await app.locator('.chip-main', { hasText: 'Cool-down stretch' }).click()
  await expect(app.locator('.label')).toHaveText('Standing quad stretch')
  await expect(demo(app)).toHaveAttribute('data-move', 'quadStretch')
  const layout = async () => {
    const slot = (await app.locator('.demo-slot').boundingBox())!
    const time = (await app.locator('.time').boundingBox())!
    return { slot: slot.height, gap: time.y - slot.y, time: time.height }
  }
  const known = await layout()

  for (let i = 0; i < 4; i++) await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Anything that feels tight')
  await expect(app.locator('.demo-slot')).toHaveCount(1)
  await expect(demo(app)).toHaveCount(0)
  await expect(app.locator('.demo-hint')).toHaveCount(0)
  expect(await layout()).toEqual(known)

  await shortcut(app, 'Escape')
  await shortcut(app, 'Escape')
  await app.locator('.chip-main', { hasText: 'Breathing' }).click()
  await expect(app.locator('.label')).toHaveText('Sit comfortably')
  await expect(app.locator('.demo-slot')).toHaveCount(0)
})

test('quick timers with an exercise name show it too', async ({ app }) => {
  await enter(app, '5m plank')
  await expect(demo(app)).toHaveAttribute('data-move', 'plank')
  await shortcut(app, 'Escape')
  await shortcut(app, 'Escape')
  await enter(app, '25m')
  await expect(app.locator('.stage')).toBeVisible()
  await expect(app.locator('.demo-slot')).toHaveCount(0)
})

test('D hides and shows the demos, with undo', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Core' }).click()
  await expect(demo(app)).toHaveAttribute('data-move', 'catCow')
  await shortcut(app, 'd')
  await expect(app.locator('.toast')).toContainText('Exercise demos off')
  await expect(app.locator('.demo-slot')).toHaveCount(0)
  await app.locator('.toast button').click()
  await expect(demo(app)).toHaveAttribute('data-move', 'catCow')
  await shortcut(app, 'd')
  await shortcut(app, 'd')
  await expect(app.locator('.toast')).toContainText('Exercise demos on')
  await expect(demo(app)).toBeVisible()
})

test('reduced motion shows a still pose with the start position faintly behind it', async ({ app }) => {
  await app.emulateMedia({ reducedMotion: 'reduce' })
  await app.locator('.chip-main', { hasText: 'Full Body' }).click()
  await expect(app.locator('.demo-ghost')).toHaveCount(1)
  await expect(demo(app)).not.toHaveAttribute('data-playing')
  await shortcut(app, 'Space')
  const still = await pose(app)
  await app.clock.runFor(1500)
  await expect.poll(() => pose(app)).toBe(still)
})

test('wide screens put the figure beside the clock, short ones leave it out', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Full Body' }).click()
  const figure = (await demo(app).boundingBox())!
  const clock = (await app.locator('.time').boundingBox())!
  expect(figure.x + figure.width).toBeLessThan(clock.x)
  expect(figure.height).toBeGreaterThan(150)

  await app.setViewportSize({ width: 844, height: 390 })
  await expect(app.locator('.demo-slot')).toBeHidden()
})

test('the builder marks exercises that have a demo and suggests a few as you type', async ({ app }) => {
  await app.locator('button', { hasText: /^\s*Routine$/ }).click()
  await app.locator('button', { hasText: /^\s*Exercise$/ }).first().click()
  const label = app.locator('.b-label').first()
  const options = app.locator('#known-work option')
  await label.focus()
  expect(await options.count()).toBeLessThanOrEqual(8)
  await label.fill('kettle')
  await expect(app.locator('#known-work option[value="Kettlebell swing"]')).toHaveCount(1)
  expect(await options.count()).toBeLessThanOrEqual(8)
  for (const value of await options.evaluateAll((list) => list.map((o) => (o as HTMLOptionElement).value))) expect(value.toLowerCase()).toContain('kettle')
  await label.fill('Russian twist')
  await expect(app.locator('.b-demo')).toHaveCount(0)
  await label.fill('KB swing')
  await expect(app.locator('.b-demo')).toHaveAttribute('data-tip', 'Shows a demo during the workout: Kettlebell swing')
})

test('help lists the demo shortcut', async ({ app }) => {
  await shortcut(app, 'Escape')
  await shortcut(app, '?')
  await expect(app.locator('.help')).toContainText('Exercise demos on · off')
})
