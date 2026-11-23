import { countDown, expect, recorded, shortcut, test } from './fixtures'

const WORK = [660, 990]
const REST = [660, 440]
const TICK = [880]
const READY = [660]

test('a routine moves through work and rest with cues and controls', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Core' }).click()
  const stage = app.locator('.stage')
  const label = app.locator('.label')
  await expect(stage).toHaveAttribute('data-state', 'armed')
  await expect(app.locator('.cue')).toContainText('Tap anywhere or press space to start')
  await expect(label).toHaveText('Dead bug')
  await expect(app.locator('.next')).toHaveText('Next · Glute bridge · 0:30')

  await shortcut(app, 'Space')
  await app.clock.runFor(400)
  await expect(app.locator('.app')).toHaveAttribute('data-phase', 'work')
  await expect(app.locator('.prep-cue')).toHaveText('Get into position')
  await app.clock.runFor(4600)
  await expect(app.locator('.time')).toHaveText('0:30')
  await expect(app.locator('.prep-cue')).toHaveCount(0)
  await app.clock.runFor(26_000)
  await expect(app.locator('.time')).toHaveText('0:04')
  await countDown(app, '0:03', '0:02', '0:01')
  await expect(app.locator('.time.urgent')).toBeVisible()
  await app.clock.runFor(1000)
  await expect(label).toHaveText('Glute bridge')
  await app.clock.runFor(400)
  await expect.poll(async () => (await recorded(app)).speech).toEqual(['Dead bug', 'Glute bridge'])

  await shortcut(app, 'ArrowRight')
  await expect(label).toHaveText('Plank')
  await expect(app.locator('.meta')).toContainText('Circuit · round 1/3')
  await expect(app.locator('.note')).toHaveText('elbows under shoulders · squeeze glutes')
  await expect(app.locator('.next')).toHaveText('Next · Rest · 0:15')

  await shortcut(app, 'ArrowRight')
  await expect(label).toHaveText('Rest')
  await expect(app.locator('.app')).toHaveAttribute('data-phase', 'rest')
  await app.clock.runFor(400)
  await expect.poll(async () => (await recorded(app)).speech.at(-1)).toBe('Rest. Next: Side plank, left')

  await shortcut(app, 'ArrowLeft')
  await expect(label).toHaveText('Plank')
  await app.clock.runFor(9000)
  await expect(app.locator('.time')).toHaveText('0:41')
  await shortcut(app, 'ArrowLeft')
  await expect(label).toHaveText('Plank')
  await expect(app.locator('.time')).toHaveText('5')

  const { tones } = await recorded(app)
  const countdown = [...TICK, ...TICK, ...TICK]
  expect(tones).toEqual([...READY, ...countdown, ...WORK, ...countdown, ...READY, ...READY, ...REST, ...READY, ...countdown, ...WORK, ...READY])

  await app.locator('.tl-step').first().click()
  await expect(label).toHaveText('Dead bug')
  await app.locator('.tl-step').nth(2).click()
  await expect(label).toHaveText('Plank')

  await shortcut(app, 'Escape')
  const finish = app.locator('.finish')
  await expect(finish.locator('.eyebrow')).toHaveText('Stopped early')
  await expect(finish.locator('.count')).toHaveText('1/2 completed')
  await app.keyboard.press('8')
  await expect(finish.locator('.field label')).toHaveText('How hard was it? 8/10')
  await finish.locator('textarea').fill('Felt good')
  await finish.locator('textarea').press('ControlOrMeta+Enter')
  await expect(app.locator('.toast')).toContainText('Workout saved')
  await expect(app.locator('.launcher')).toBeVisible()

  await shortcut(app, 'h')
  const today = app.locator('.history .day').first()
  await expect(today.locator('h3')).toContainText('Today')
  await expect(today.locator('li')).toHaveCount(1)
  await expect(today.locator('.log-did')).toHaveText('Dead bug · Glute bridge')
  await expect(today.locator('.log-meta')).toHaveText('effort 8/10 · 1/2 blocks', { useInnerText: true })
  await expect(today.locator('.log-note')).toHaveText('Felt good')
  await expect(today.locator('button.log-body')).toHaveCount(0)
  await shortcut(app, 'Escape')

  await app.keyboard.press('ControlOrMeta+z')
  await shortcut(app, 'h')
  await expect(app.locator('.history h3').first()).not.toContainText('Today')
})

test('a routine that runs to the end opens the finish sheet', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Breathing' }).click()
  await app.locator('.stage').click()
  await app.clock.runFor(188_000)
  const finish = app.locator('.finish')
  await expect(finish.locator('.eyebrow')).toHaveText('Complete')
  await expect(finish.locator('.big')).toHaveText('3:07')
  await expect(finish.locator('.count')).toHaveText('2/2 completed')
  await expect.poll(async () => (await recorded(app)).speech.at(-1)).toBe('Done')
  await app.keyboard.press('Enter')
  await expect(app.locator('.toast')).toContainText('Workout saved')
  await expect(app.locator('.today')).toHaveText('Today · 1 logged · 3m 7s')
})

test('discarding a workout logs nothing', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Tabata' }).click()
  await shortcut(app, 'Space')
  await app.clock.runFor(5000)
  await shortcut(app, 'Escape')
  await app.locator('.finish .btn.ghost').click()
  await expect(app.locator('.toast')).toHaveText('Workout discarded')
  await expect(app.locator('.today')).toHaveText('Nothing logged today yet')
})

test('an unstarted routine closes without asking', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Tabata' }).click()
  await shortcut(app, 'Escape')
  await expect(app.locator('.launcher')).toBeVisible()
})

test('sound and voice switches mute the cues and are remembered', async ({ app }) => {
  await shortcut(app, 's')
  await shortcut(app, 'v')
  await expect(app.locator('[data-tool=mute]')).toHaveAttribute('data-off')
  await expect(app.locator('[data-tool=voice]')).toHaveAttribute('data-off')
  await app.locator('.chip-main', { hasText: 'Core' }).click()
  await shortcut(app, 'Space')
  await app.clock.runFor(36_000)
  await expect(app.locator('.label')).toHaveText('Glute bridge')
  const { tones, speech } = await recorded(app)
  expect(tones).toEqual([])
  expect(speech).toEqual([])

  await app.clock.runFor(2000)
  await app.reload()
  await expect(app.locator('[data-tool=mute]')).toHaveAttribute('data-off')
  await expect(app.locator('[data-tool=voice]')).toHaveAttribute('data-off')
})

test('the edit shortcut opens the running routine', async ({ app }) => {
  await app.locator('.chip-main', { hasText: 'Core' }).click()
  await shortcut(app, 'Space')
  await shortcut(app, 'e')
  await expect(app.locator('.editor h2')).toHaveText('Edit routine')
  await app.clock.runFor(8000)
  await expect(app.locator('.b-title')).toHaveValue('Core (10 min)')
  await app.locator('.b-title').press('Escape')
  await expect(app.locator('.editor')).toHaveCount(0)
  await expect(app.locator('.time')).toHaveText('0:27')
})
