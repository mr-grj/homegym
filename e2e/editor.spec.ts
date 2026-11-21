import { expect, shortcut, test } from './fixtures'
import type { Page } from '@playwright/test'

test.use({ fakeClock: false })

const chip = (page: Page, name: string) => page.locator('.chip', { has: page.locator('.chip-main', { hasText: name }) })
const labels = (page: Page) => page.locator('.b-label').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))

async function source(page: Page) {
  await page.keyboard.press('ControlOrMeta+e')
  const text = await page.locator('.editor textarea').inputValue()
  await page.keyboard.press('ControlOrMeta+e')
  await expect(page.locator('.builder')).toBeVisible()
  return text
}

test('a routine built with fields is saved, edited as text and run', async ({ app }) => {
  await app.locator('.chip.ghost', { hasText: 'Routine' }).click()
  await expect(app.locator('.b-title')).toBeFocused()
  await expect(app.locator('.editor .btn.primary')).toBeDisabled()

  await app.keyboard.type('Leg day')
  await app.keyboard.press('Enter')
  await app.keyboard.type('Warm-up')
  await app.keyboard.press('Enter')
  await app.keyboard.type('Jumping jacks')
  await app.keyboard.press('Tab')
  await expect(app.locator('.b-presets')).toBeVisible()
  await app.keyboard.type('30')
  await app.keyboard.press('Shift+Tab')
  await app.keyboard.press('Enter')
  await app.keyboard.type('Squats')
  await expect(app.locator('.b-time').nth(1)).toHaveValue('30s')
  await expect(app.locator('.preview')).toContainText('Squats')
  expect(await source(app)).toBe('# Leg day\n\n## Warm-up\nJumping jacks 30s\nSquats 30s\n')

  await app.locator('.b-step').nth(1).locator('.b-label').focus()
  await app.keyboard.press('Alt+ArrowUp')
  await expect.poll(() => labels(app)).toEqual(['Squats', 'Jumping jacks'])
  await expect(app.locator('.b-step').nth(0).locator('.b-label')).toBeFocused()

  await app.locator('.b-step').nth(0).locator('.b-icon').click()
  await expect(app.locator('.toast')).toContainText('Removed “Squats”')
  await expect.poll(() => labels(app)).toEqual(['Jumping jacks'])
  await app.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => labels(app)).toEqual(['Squats', 'Jumping jacks'])
  await expect(app.locator('.toast')).toHaveCount(0)

  await app.locator('.b-rounds button').nth(1).click()
  await expect(app.locator('.b-rounds .num')).toHaveText('×2')
  await expect(app.locator('.preview h3 .num')).toHaveText('2:00')

  await app.keyboard.press('ControlOrMeta+Enter')
  await expect(app.locator('.editor')).toHaveCount(0)
  await expect(chip(app, 'Leg day')).toContainText('2:00')

  await chip(app, 'Leg day').locator('.chip-edit').click()
  await app.locator('.editor').focus()
  await app.keyboard.press('ControlOrMeta+e')
  const textarea = app.locator('.editor textarea')
  await expect(textarea).toHaveValue('# Leg day\n\n## Warm-up ×2\nSquats 30s\nJumping jacks 30s\n')
  await textarea.press('End')
  await textarea.press('ControlOrMeta+End')
  await textarea.pressSequentially('~ Rest 15s\n')
  await expect(app.locator('.preview li[data-rest]')).toHaveText('Rest0:15')
  await app.keyboard.press('ControlOrMeta+e')
  await expect(app.locator('.b-step[data-rest] .b-label')).toHaveValue('Rest')
  await app.keyboard.press('ControlOrMeta+Enter')
  await expect(chip(app, 'Leg day')).toContainText('2:30')

  await chip(app, 'Leg day').locator('.chip-main').click()
  await expect(app.locator('.label')).toHaveText('Squats')
  await expect(app.locator('.meta')).toContainText('Warm-up · round 1/2')
})

test('save as new keeps the original and names the copy', async ({ app }) => {
  await chip(app, 'Core').locator('.chip-edit').click()
  await expect(app.locator('.editor h2')).toHaveText('Edit routine')
  await app.locator('.editor').focus()
  await app.keyboard.press('ControlOrMeta+Shift+Enter')
  await expect(app.locator('.toast')).toContainText('Saved as “Core (10 min) copy”')
  await expect(chip(app, 'Core (10 min) copy')).toBeVisible()
  await expect(app.locator('.routines .chip-main', { hasText: /^Core \(10 min\)10:00$/ })).toHaveCount(1)
})

test('deleting a routine can be undone', async ({ app }) => {
  await chip(app, 'Tabata').locator('.chip-edit').click()
  await app.locator('.editor .btn.danger').click()
  await expect(app.locator('.toast')).toContainText('Deleted Tabata (12 min)')
  await expect(chip(app, 'Tabata')).toHaveCount(0)
  await app.keyboard.press('ControlOrMeta+z')
  await expect(chip(app, 'Tabata')).toHaveCount(1)
})

test('escape asks before throwing away edits', async ({ app }) => {
  const questions: string[] = []
  app.removeAllListeners('dialog')
  app.on('dialog', (dialog) => {
    questions.push(dialog.message())
    void (questions.length === 1 ? dialog.dismiss() : dialog.accept())
  })
  await chip(app, 'Core').locator('.chip-edit').click()
  await app.locator('.b-title').fill('Core changed')
  await app.locator('.b-title').press('Escape')
  await expect(app.locator('.editor')).toBeVisible()
  await app.locator('.b-title').press('Escape')
  await expect(app.locator('.editor')).toHaveCount(0)
  expect(questions).toEqual(['Discard your changes?', 'Discard your changes?'])
  await expect(chip(app, 'Core (10 min)')).toBeVisible()
})

test('the help sheet lists the shortcuts and any key closes it', async ({ app }) => {
  await shortcut(app, '?')
  await expect(app.locator('.help')).toContainText('Edit current routine')
  await app.keyboard.press('x')
  await expect(app.locator('.help')).toHaveCount(0)
})
