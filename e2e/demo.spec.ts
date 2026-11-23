import type { Page } from '@playwright/test'
import { enter, expect, shortcut, test } from './fixtures'

const demo = (page: Page) => page.locator('.demo')
const body = (page: Page) => page.locator('.demo > g:last-of-type polyline').first()

test('the figure shows the exercise, previews the next one during a rest and follows the timer', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Full body' }).click()
  await expect(demo(app)).toHaveAttribute('data-move', 'squat')
  await expect(demo(app)).toHaveAttribute('data-playing')
  await expect(demo(app)).not.toHaveAttribute('data-dim')

  await shortcut(app, 'Space')
  await expect(app.locator('.prep-cue')).toBeVisible()
  await expect(demo(app)).not.toHaveAttribute('data-playing')
  const start = await body(app).getAttribute('points')
  await app.clock.runFor(2000)
  await expect(body(app)).toHaveAttribute('points', start!)
  await app.clock.runFor(3500)
  await expect(demo(app)).toHaveAttribute('data-playing')
  await expect(body(app)).not.toHaveAttribute('points', start!)

  for (let i = 0; i < 5; i++) await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Switch')
  await expect(demo(app)).toHaveAttribute('data-move', 'standingBandRow')
  await expect(demo(app)).toHaveAttribute('data-dim')
  await expect(app.locator('.demo-cue')).toHaveText('Up next')

  await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Band row')
  await expect(demo(app)).toHaveAttribute('data-move', 'standingBandRow')
  await expect(demo(app)).not.toHaveAttribute('data-dim')
  await expect(app.locator('.demo-over')).toHaveCount(0)

  await shortcut(app, 'Space')
  await expect(demo(app)).not.toHaveAttribute('data-playing')
  const paused = await body(app).getAttribute('points')
  await app.clock.runFor(2000)
  await expect(body(app)).toHaveAttribute('points', paused!)
})

test('unknown exercises show nothing and the clock never moves', async ({ app }) => {
  await app.setViewportSize({ width: 390, height: 844 })
  await app.locator('.chip-main', { hasText: 'Morning mobility' }).click()
  await expect(app.locator('.label')).toHaveText('Cat-cow')
  await expect(demo(app)).toHaveAttribute('data-move', 'catCow')
  const clock = await app.locator('.time').boundingBox()

  await shortcut(app, 'ArrowRight')
  await expect(app.locator('.label')).toHaveText('Thoracic rotations')
  await expect(app.locator('.demo-slot')).toHaveCount(1)
  await expect(demo(app)).toHaveCount(0)
  expect(await app.locator('.time').boundingBox()).toEqual(clock)

  await shortcut(app, 'Escape')
  await shortcut(app, 'Escape')
  await app.locator('.chip-main', { hasText: 'Deep work' }).click()
  await expect(app.locator('.label')).toHaveText('Focus')
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
  await expect(demo(app)).toHaveAttribute('data-move', 'deadBug')
  await shortcut(app, 'd')
  await expect(app.locator('.toast')).toContainText('Exercise demos off')
  await expect(app.locator('.demo-slot')).toHaveCount(0)
  await app.locator('.toast button').click()
  await expect(demo(app)).toHaveAttribute('data-move', 'deadBug')
  await shortcut(app, 'd')
  await shortcut(app, 'd')
  await expect(app.locator('.toast')).toContainText('Exercise demos on')
  await expect(demo(app)).toBeVisible()
})

test('reduced motion shows a still pose with the start position faintly behind it', async ({ app }) => {
  await app.emulateMedia({ reducedMotion: 'reduce' })
  await app.locator('.chip-main', { hasText: 'Full body' }).click()
  await expect(app.locator('.demo-ghost')).toHaveCount(1)
  await expect(demo(app)).not.toHaveAttribute('data-playing')
  await shortcut(app, 'Space')
  const still = await body(app).getAttribute('points')
  await app.clock.runFor(1500)
  await expect(body(app)).toHaveAttribute('points', still!)
})

test('wide screens put the figure beside the clock, short ones leave it out', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Full body' }).click()
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
  await label.fill('Thoracic rotations')
  await expect(app.locator('.b-demo')).toHaveCount(0)
  await label.fill('KB swing')
  await expect(app.locator('.b-demo')).toHaveAttribute('data-tip', 'Shows a demo during the workout: Kettlebell swing')
})

test('help lists the demo shortcut', async ({ app }) => {
  await shortcut(app, 'Escape')
  await shortcut(app, '?')
  await expect(app.locator('.help')).toContainText('Exercise demos on · off')
})
