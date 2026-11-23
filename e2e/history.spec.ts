import { expect, shortcut, START, test, type Page } from './fixtures'

const LONG_NOTE = Array.from({ length: 30 }, () => 'Felt strong today, try the 12 kg kettlebell next time.').join(' ')
const URL_NOTE = `Music: https://www.youtube.com/watch?v=${'x'.repeat(120)}`

async function seed(page: Page, count = 40) {
  await page.evaluate(
    ({ count, start, longNote, urlNote }) => {
      const sessions = Array.from({ length: count }, (_, i) => {
        const at = new Date(start - (i * 7 + 1) * 3_600_000)
        const seconds = i === 3 ? 3 * 3600 + 25 * 60 : i % 3 ? 600 : 9
        if (i === 4)
          return {
            id: i + 1,
            title: 'Antrenament full-body (20 min)',
            started_at: at.toISOString(),
            ended_at: new Date(at.getTime() + 1200_000).toISOString(),
            seconds: 1200,
            effort: 8,
            notes: '',
            blocks: [
              { name: 'Încălzire', done: true, exercises: ['Genuflexiuni fără greutate', 'Aplecări din șold, spatele drept', 'Rotiri de umeri și brațe', 'Fandări ușoare alternativ'] },
              { name: 'Blocul A', done: true, exercises: ['Goblet squat', 'Ramat cu bandă elastică'] },
              { name: 'Blocul B', done: false, exercises: ['Burpees'] },
            ],
          }
        return {
          id: i + 1,
          title: i === 0 ? 'A routine title long enough to wrap past the width of a small phone screen' : i % 3 ? 'Core (10 min)' : 'Timer',
          started_at: at.toISOString(),
          ended_at: new Date(at.getTime() + seconds * 1000).toISOString(),
          seconds,
          effort: i % 3 ? 6 : null,
          notes: i === 0 ? longNote : i === 1 ? urlNote : '',
          blocks: i % 3 ? [{ name: 'Activation', done: true, exercises: ['Dead bug', 'Glute bridge'] }] : [],
        }
      })
      localStorage.setItem('homegym.demo', JSON.stringify({ next: 1000, routines: [], sessions, settings: {} }))
    },
    { count, start: START.getTime(), longNote: LONG_NOTE, urlNote: URL_NOTE },
  )
  await page.reload()
  await shortcut(page, 'h')
  await expect(page.locator('.history .log')).toHaveCount(count)
  await page.locator('.sheet').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
}

async function checkLayout(page: Page) {
  const sheet = await page.locator('.sheet').boundingBox()
  const viewport = page.viewportSize()!
  expect(sheet!.y + sheet!.height).toBeLessThanOrEqual(viewport.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  const list = page.locator('.history-list')
  expect(await list.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0)
  expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)

  for (const day of await page.locator('.day').all()) {
    const total = await day.locator('h3 .num').boundingBox()
    for (const time of await day.locator('.log-time').all()) {
      const box = await time.boundingBox()
      expect(Math.abs(box!.x + box!.width - (total!.x + total!.width))).toBeLessThan(1)
    }
  }

  const title = await page.locator('.history h2').boundingBox()
  await list.evaluate((el) => (el.scrollTop = el.scrollHeight))
  expect(await page.locator('.history h2').boundingBox()).toEqual(title)
  await expect(list).not.toHaveAttribute('data-fade-bottom')
  const offset = await list.evaluate((el) => {
    const day = el.querySelectorAll('.day')[2]
    el.scrollTop += day.getBoundingClientRect().top - el.getBoundingClientRect().top + 40
    return day.querySelector('h3')!.getBoundingClientRect().top - el.getBoundingClientRect().top
  })
  expect(Math.abs(offset)).toBeLessThan(1)
}

test('a long history scrolls under a fixed title with totals lined up', async ({ app }) => {
  await seed(app)
  await expect(app.locator('.sheet')).toHaveClass(/wide/)
  await expect(app.locator('.history-list')).toHaveAttribute('data-fade-bottom')
  await checkLayout(app)
})

test('long entries open and close, short ones stay still', async ({ app }) => {
  await seed(app)
  const long = app.locator('.log').first()
  const note = long.locator('.log-note')
  const closed = (await note.boundingBox())!.height
  const toggle = long.locator('button.log-body')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect((await note.boundingBox())!.height).toBeGreaterThan(closed * 4)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect((await note.boundingBox())!.height).toBe(closed)

  await expect(app.locator('.log').nth(2).locator('button.log-body')).toHaveCount(0)
  await expect(app.locator('.log').nth(1).locator('.log-note')).toContainText('youtube.com')
})

test.describe('on a small touch screen', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true })

  test('history fits, keeps totals lined up and shows the time with the details', async ({ app }) => {
    await seed(app)
    await checkLayout(app)
    await expect(app.locator('.log .when').first()).toBeHidden()
    await expect(app.locator('.log').nth(1).locator('.log-meta')).toHaveText(/^\d{1,2}:\d{2}.* · effort 6\/10 · 1\/1 blocks$/, { useInnerText: true })
    await expect(app.locator('.log').nth(2).locator('.log-meta')).toBeVisible()
    expect(Number(await app.locator('.log .icon-btn').first().evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0)
  })
})

const hoursBack = (i: number) => new Date(START.getTime() - (i * 7 + 1) * 3_600_000)
const loggedOn = (date: number) => Array.from({ length: 40 }, (_, i) => hoursBack(i)).filter((d) => d.getDate() === date).length
const search = (page: Page) => page.locator('.history-search input')
const count = (page: Page) => page.locator('.history-count')

test.describe('search and calendar', () => {
  test('words match titles, exercises and notes, ignoring case and diacritics', async ({ app }) => {
    await seed(app)
    const sheet = (await app.locator('.sheet').boundingBox())!.height
    await expect(search(app)).toBeFocused()

    await search(app).fill('SOLD')
    await expect(app.locator('.log')).toHaveCount(1)
    await expect(app.locator('.log-did')).toHaveText('Aplecări din șold, spatele drept +5')
    await expect(app.locator('.log-did mark')).toHaveText('șold')
    await expect(count(app)).toHaveText('1 logged · 20m')
    await app.locator('.log button.log-body').click()
    await expect(app.locator('.log-did')).toContainText('Genuflexiuni fără greutate · Aplecări din șold')
    await expect(app.locator('.log-did')).not.toContainText('Burpees')

    await search(app).fill('core 10')
    await expect(app.locator('.log')).toHaveCount(await app.locator('.log-title', { hasText: 'Core (10 min)' }).count())
    expect(await app.locator('.log').count()).toBeGreaterThan(10)

    await search(app).fill('kettlebell')
    await expect(app.locator('.log')).toHaveCount(1)
    await expect(app.locator('.log-note mark').first()).toHaveText('kettlebell')

    await search(app).fill('burpees')
    await expect(app.locator('.history-list .empty')).toHaveText('Nothing matches “burpees”.')
    await expect(count(app)).toHaveCount(0)
    expect((await app.locator('.sheet').boundingBox())!.height).toBe(sheet)

    await search(app).press('Escape')
    await expect(search(app)).toHaveValue('')
    await expect(app.locator('.log')).toHaveCount(40)
    await search(app).press('Escape')
    await expect(app.locator('.history')).toHaveCount(0)
  })

  test('typed dates filter whole days or months', async ({ app }) => {
    await seed(app)
    await search(app).fill('nov 19')
    await expect(app.locator('.log')).toHaveCount(loggedOn(19))
    await expect(count(app)).toContainText(`Yesterday · ${loggedOn(19)} logged`)
    await expect(app.locator('.cal-day[data-on]')).toHaveText('19')

    for (const text of ['19 nov', '19.11', '2026-11-19', 'Nov 19th']) {
      await search(app).fill(text)
      await expect(app.locator('.log'), text).toHaveCount(loggedOn(19))
    }
    await search(app).fill('today')
    await expect(app.locator('.log')).toHaveCount(loggedOn(20))
    await search(app).fill('yesterday core')
    await expect(app.locator('.log')).toHaveCount(await app.locator('.log-title', { hasText: 'Core' }).count())
    await expect(count(app)).toContainText('Yesterday')

    await search(app).fill('nov')
    await expect(app.locator('.log')).toHaveCount(40)
    await expect(app.locator('.cal-month')).toHaveAttribute('data-on')
    await expect(app.locator('.cal-day[data-on]')).toHaveCount(0)

    await search(app).fill('oct 2')
    await expect(app.locator('.history-list .empty')).toHaveText('Nothing logged on Fri, Oct 2.')
    await expect(app.locator('.cal-month')).toContainText('October 2026')
    await search(app).fill('core oct 2')
    await expect(app.locator('.history-list .empty')).toHaveText('Nothing matches “core” on Fri, Oct 2.')

    await search(app).fill('20 min')
    await expect(count(app)).not.toContainText('Nov')
  })

  test('the calendar marks logged days and picks one or a whole month', async ({ app }) => {
    await seed(app)
    await expect(app.locator('.cal-toggle')).toBeHidden()
    await expect(app.locator('.cal-month')).toHaveText('November 2026')
    await expect(app.locator('.cal-day[data-today]')).toHaveText('20')
    await expect(app.locator('.cal-head .icon-btn').last()).toBeDisabled()
    await expect(app.locator('.cal-day', { hasText: /^21$/ })).toBeDisabled()
    const logged = await app.locator('.cal-day[data-has]').count()
    expect(logged).toBe(new Set(Array.from({ length: 40 }, (_, i) => hoursBack(i).getDate())).size)

    await search(app).fill('core 20.11')
    await app.locator('.cal-day', { hasText: /^19$/ }).click()
    await expect(search(app)).toHaveValue('core')
    await expect(app.locator('.day-chip')).toHaveText('Yesterday')
    await expect(app.locator('.cal-day[data-on]')).toHaveText('19')
    await expect(app.locator('.log-title')).toHaveText(Array(await app.locator('.log').count()).fill('Core (10 min)'))
    await expect(app.locator('.day h3')).toHaveCount(1)

    await search(app).fill('')
    await expect(app.locator('.log')).toHaveCount(loggedOn(19))
    await search(app).press('Backspace')
    await expect(app.locator('.day-chip')).toHaveCount(0)
    await expect(app.locator('.log')).toHaveCount(40)

    await app.locator('.cal-day', { hasText: /^20$/ }).click()
    await expect(app.locator('.log')).toHaveCount(loggedOn(20))
    await app.locator('.cal-day', { hasText: /^20$/ }).click()
    await expect(app.locator('.log')).toHaveCount(40)

    await app.locator('.cal-month').click()
    await expect(app.locator('.day-chip')).toHaveText('Nov 2026')
    await search(app).fill('nov 19')
    await expect(app.locator('.day-chip')).toHaveCount(0)
    await expect(app.locator('.log')).toHaveCount(loggedOn(19))
  })

  test('deleting while filtered keeps the filter and undo brings the entry back', async ({ app }) => {
    await seed(app)
    await search(app).fill('kettlebell')
    await app.locator('.log').hover()
    await app.locator('.log .icon-btn').click()
    await expect(app.locator('.history-list .empty')).toHaveText('Nothing matches “kettlebell”.')
    await expect(search(app)).toHaveValue('kettlebell')
    await app.locator('.toast button').click()
    await expect(app.locator('.log')).toHaveCount(1)
  })
})

test.describe('search on a small touch screen', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true })

  test('the calendar opens from the field and closes after a pick', async ({ app }) => {
    await seed(app)
    await expect(search(app)).not.toBeFocused()
    await expect(app.locator('.calendar')).toBeHidden()
    await app.locator('.cal-toggle').click()
    await expect(app.locator('.calendar')).toBeVisible()
    await expect(app.locator('.cal-toggle')).toHaveAttribute('aria-expanded', 'true')
    await app.locator('.cal-day', { hasText: /^19$/ }).click()
    await expect(app.locator('.calendar')).toBeHidden()
    await expect(app.locator('.day-chip')).toHaveText('Yesterday')
    await expect(app.locator('.log')).toHaveCount(loggedOn(19))

    await search(app).fill('a much longer search than the field can show at this width')
    expect(await app.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    const field = await app.locator('.history-search').boundingBox()
    const sheet = await app.locator('.sheet').boundingBox()
    expect(field!.x + field!.width).toBeLessThanOrEqual(sheet!.x + sheet!.width)
    expect((await search(app).boundingBox())!.width).toBeGreaterThan(40)
  })
})
