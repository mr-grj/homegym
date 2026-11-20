import { countDown, enter, expect, recorded, shortcut, test } from './fixtures'

const PLAYLIST = 'https://music.youtube.com/playlist?list=PLfake'

test('music follows the timer: plays, pauses, ducks for the countdown and fades out', async ({ app }) => {
  await expect(app.locator('.hint span')).toBeVisible()
  await enter(app, PLAYLIST)
  await expect(app.locator('.toast')).toHaveText('Music ready. It starts with your timer')
  await expect(app.locator('.music-meta b')).toHaveText('Fake song')
  await expect(app.locator('.app')).toHaveAttribute('data-dock', '')

  await enter(app, '20s')
  await expect(app.locator('.music')).toHaveAttribute('data-playing')
  await shortcut(app, 'Space')
  await expect(app.locator('.music')).not.toHaveAttribute('data-playing')
  await shortcut(app, 'Space')
  await expect(app.locator('.music')).toHaveAttribute('data-playing')

  await app.clock.runFor(16_000)
  await expect(app.locator('.time')).toHaveText('0:04')
  await countDown(app, '0:03', '0:02', '0:01')
  expect(Math.min(...(await recorded(app)).volume)).toBe(13)

  await app.clock.runFor(1000)
  await expect(app.locator('.label')).toHaveText('Done')
  await app.clock.runFor(2500)
  const { player, volume } = await recorded(app)
  expect(player).toEqual(['create', 'play', 'pause', 'play', 'pause'])
  expect(volume.at(-1)).toBe(0)
  await expect(app.locator('.music')).not.toHaveAttribute('data-playing')
})

test('a link pasted anywhere loads, and the player keeps it across reloads', async ({ app }) => {
  await app.evaluate(() => {
    const data = new DataTransfer()
    data.setData('text', 'https://youtu.be/dQw4w9WgXcQ')
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
  })
  await expect(app.locator('.toast')).toHaveText('Music ready. It starts with your timer')
  await expect(app.locator('.music-meta b')).toHaveText('Fake song')

  await shortcut(app, 'm')
  await expect(app.locator('.music')).toHaveAttribute('data-playing')
  await shortcut(app, 'm')
  await expect(app.locator('.music')).not.toHaveAttribute('data-playing')
  await shortcut(app, ']')
  await shortcut(app, '[')
  expect((await recorded(app)).player).toEqual(['create', 'play', 'pause', 'next', 'prev'])

  await app.clock.runFor(2000)
  await app.reload()
  await expect(app.locator('.music-meta b')).toHaveText('Fake song')
})

test('the picker lists recent links and its switches change how music behaves', async ({ app }) => {
  await enter(app, PLAYLIST)
  await expect(app.locator('.music-meta b')).toHaveText('Fake song')
  await app.locator('[data-tool=music]').click()
  const picker = app.locator('.music-picker')
  await expect(picker.locator('.recent-music li')).toHaveText(['Fake songplaylist'])
  await picker.locator('label.follow', { hasText: 'Follow the timer' }).locator('input').uncheck()
  await shortcut(app, 'Escape')
  await expect(app.locator('.music .toggle')).not.toHaveAttribute('data-on')

  await enter(app, '1m')
  await app.clock.runFor(2000)
  expect((await recorded(app)).player).toEqual(['create'])

  await app.locator('.music-controls [data-tip="Remove music"]').click()
  await expect(app.locator('.music')).toHaveCount(0)
})

test('a bad link explains itself in the picker', async ({ app }) => {
  await shortcut(app, 'm')
  const picker = app.locator('.music-picker')
  await picker.locator('input').first().fill('https://example.com/song')
  await expect(picker.locator('.picker-error')).toHaveText('That doesn’t look like a YouTube or SoundCloud link')
})
