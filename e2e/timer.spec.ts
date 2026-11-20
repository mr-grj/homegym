import { countDown, enter, expect, recorded, shortcut, test } from './fixtures'

const CHIME = { work: [660, 990], tick: [880], done: [523.25, 659.25, 783.99, 1046.5] }

test('the clock understands typed timers', async ({ app }) => {
  const hint = app.locator('.hint span')
  for (const [text, expected] of [
    ['25m', 'start 25:00 countdown'],
    ['25', 'start 25:00 countdown'],
    ['1:30', 'start 1:30 countdown'],
    ['90s', 'start 1:30 countdown'],
    ['1h 15m', 'start 1:15:00 countdown'],
    ['5m plank', 'start 5:00 countdown · plank'],
    ['', 'start stopwatch'],
    ['core', 'open Core (10 min)'],
    ['https://music.youtube.com/playlist?list=PLx', 'load this music'],
    ['abc', 'No match. Try 25m, 1:30 or 90s'],
  ]) {
    await app.locator('.entry-input').fill(text)
    await expect(hint).toHaveText(expected)
  }
  await expect(app.locator('.hint')).toHaveAttribute('data-invalid')
  await app.locator('.entry-input').press('Enter')
  await expect(app.locator('.launcher')).toBeVisible()
})

test('a countdown pauses, resumes, changes length and logs itself', async ({ app }) => {
  await enter(app, '1:30 plank')
  const time = app.locator('.time')
  await expect(time).toHaveText('1:30')
  await expect(app.locator('.label')).toHaveText('plank')
  await expect(app).toHaveTitle('▶ 1:30 · plank')

  await app.clock.runFor(10_000)
  await expect(time).toHaveText('1:20')

  await shortcut(app, 'Space')
  await expect(app).toHaveTitle('❚❚ 1:20 · plank')
  await expect(app.locator('.cue')).toContainText('Paused')
  await app.clock.runFor(30_000)
  await expect(time).toHaveText('1:20')

  await shortcut(app, 'Space')
  await app.clock.runFor(5_000)
  await expect(time).toHaveText('1:15')

  await shortcut(app, 't')
  await expect(time).toHaveText('0:15')
  await expect(app.locator('.mode')).toHaveText('elapsed')
  await shortcut(app, 't')
  await expect(time).toHaveText('1:15')

  await shortcut(app, 'ArrowUp')
  await expect(time).toHaveText('2:15')
  await shortcut(app, 'ArrowDown')
  await expect(time).toHaveText('1:15')

  await app.clock.runFor(71_000)
  await expect(time).toHaveText('0:04')
  await countDown(app, '0:03', '0:02', '0:01')
  await app.clock.runFor(1000)
  await expect(app.locator('.label')).toHaveText('Done')
  await expect(app.locator('.cue')).toHaveText('Logged · tap to close')
  await expect(app.locator('.toast')).toContainText('Logged plank · 1m 30s')
  await expect(app).toHaveTitle('✓ 1:30 · plank')

  const { tones, speech } = await recorded(app)
  expect(tones).toEqual([...CHIME.work, ...CHIME.tick, ...CHIME.tick, ...CHIME.tick, ...CHIME.done])
  expect(speech).toEqual(['Done'])

  await shortcut(app, 'Space')
  await expect(app.locator('.launcher')).toBeVisible()
  await expect(app.locator('.recent-timer').first()).toHaveText('1:30 plank')
  await expect(app.locator('.today')).toHaveText('Today · 1 logged · 1m 30s')
})

test('an empty Enter starts a stopwatch that logs when stopped', async ({ app }) => {
  await enter(app, '')
  await expect(app.locator('.label')).toHaveText('Stopwatch')
  await app.clock.runFor(65_000)
  await expect(app.locator('.time')).toHaveText('1:05')
  await expect(app.locator('.mode')).toHaveCount(0)
  await shortcut(app, 'Escape')
  await expect(app.locator('.launcher')).toBeVisible()
  await expect(app.locator('.toast')).toContainText('Logged Stopwatch · 1m 5s')

  await shortcut(app, 'u')
  await expect(app.locator('.toast')).toHaveCount(0)
  await expect(app.locator('.today')).toHaveText('Nothing logged today yet')
})

test('a timer stopped within five seconds is not logged', async ({ app }) => {
  await enter(app, '25m')
  await app.clock.runFor(3000)
  await shortcut(app, 'Escape')
  await expect(app.locator('.launcher')).toBeVisible()
  await expect(app.locator('.toast')).toHaveCount(0)
  await expect(app.locator('.today')).toHaveText('Nothing logged today yet')
})

test('recent timers start again with one click', async ({ app }) => {
  const chips = app.locator('.recent-timer')
  await expect(chips).toHaveText(['25:00 focus', '5:00', '1:30'])
  await chips.nth(1).click()
  await expect(app.locator('.time')).toHaveText('5:00')
  await expect(app.locator('.stage')).toHaveAttribute('data-state', 'running')
})

test.describe('with the real clock', () => {
  test.use({ fakeClock: false })

  test('a reload keeps the running timer', async ({ app }) => {
    await app.locator('.chip-main', { hasText: 'Core' }).click()
    await shortcut(app, 'Space')
    await expect(app.locator('.time')).toHaveText('0:28', { timeout: 4000 })
    await app.reload()
    await expect(app.locator('.stage')).toHaveAttribute('data-state', 'running')
    await expect(app.locator('.label')).toHaveText('Dead bug')
    await expect(app.locator('.time')).toHaveText(/0:2[0-8]/)
  })
})
