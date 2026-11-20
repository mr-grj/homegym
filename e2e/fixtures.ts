import { expect, test as base, type Page } from '@playwright/test'

export type Log = { tones: number[]; speech: string[]; player: string[]; volume: number[] }

declare global {
  interface Window {
    log: Log
  }
}

export const START = new Date('2026-11-20T08:00:00')

function installFakes() {
  const log: Log = { tones: [], speech: [], player: [], volume: [] }
  window.log = log

  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    resume() {
      return Promise.resolve()
    }
    createOscillator() {
      const osc = {
        frequency: { value: 0 },
        connect: <T>(node: T) => node,
        start: () => void log.tones.push(osc.frequency.value),
        stop: () => {},
      }
      return osc
    }
    createGain() {
      return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: <T>(node: T) => node }
    }
  }

  type Events = { onReady(): void; onStateChange(e: { data: number }): void }
  class FakePlayer {
    events: Events
    constructor(_: HTMLElement, options: { events: Events }) {
      this.events = options.events
      log.player.push('create')
      const channel = new MessageChannel()
      channel.port1.onmessage = () => this.events.onReady()
      channel.port2.postMessage(null)
    }
    playVideo() {
      log.player.push('play')
      this.events.onStateChange({ data: 1 })
    }
    pauseVideo() {
      log.player.push('pause')
      this.events.onStateChange({ data: 2 })
    }
    nextVideo() {
      log.player.push('next')
    }
    previousVideo() {
      log.player.push('prev')
    }
    setVolume(volume: number) {
      log.volume.push(volume)
    }
    getCurrentTime() {
      return 0
    }
    getDuration() {
      return 180
    }
    getPlaylistIndex() {
      return 0
    }
    getVideoData() {
      return { video_id: 'abcdefghijk', title: 'Fake song', author: 'Fake band' }
    }
    cuePlaylist() {}
    loadPlaylist() {}
    cueVideoById() {}
    loadVideoById() {}
    destroy() {
      log.player.push('destroy')
    }
  }

  Object.assign(window, { AudioContext: FakeAudioContext, YT: { Player: FakePlayer } })
  speechSynthesis.speak = (utterance) => void log.speech.push(utterance.text)
  speechSynthesis.cancel = () => {}
}

export const test = base.extend<{ fakeClock: boolean; app: Page }>({
  fakeClock: [true, { option: true }],
  app: async ({ page, fakeClock }, use) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('dialog', (dialog) => void dialog.accept())
    await page.route(/i\.ytimg\.com/, (route) => route.abort())
    await page.addInitScript(installFakes)
    if (fakeClock) await page.clock.install({ time: START })
    await page.goto('./')
    await expect(page.locator('.chip-main').first()).toBeVisible()
    if (fakeClock) await page.clock.pauseAt(new Date(START.getTime() + 60_000))
    await use(page)
    expect(errors).toEqual([])
  },
})

export { expect }

/** Recorded tones, speech and player calls. */
export const recorded = (page: Page) => page.evaluate(() => structuredClone(window.log))

/** Type into the clock and press Enter. */
export async function enter(page: Page, text: string) {
  await page.locator('.entry-input').fill(text)
  await page.locator('.entry-input').press('Enter')
}

/** Press a global shortcut with nothing focused. */
export async function shortcut(page: Page, key: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press(key)
}

/** Move the fake clock forward one second at a time, waiting for the screen to follow each step. */
export async function countDown(page: Page, ...shown: string[]) {
  for (const text of shown) {
    await page.clock.runFor(1000)
    await expect(page.locator('.time')).toHaveText(text)
  }
}
