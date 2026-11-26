import { describe, expect, test } from 'vitest'
import { isShortLink, parseSoundCloud } from './soundcloud'
import { pickVoice, rankVoices, voiceName } from './sound'
import { parseYouTube } from './youtube'

describe('parseYouTube', () => {
  test.each([
    ['https://music.youtube.com/playlist?list=PL123', { list: 'PL123' }],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL9', { videoId: 'dQw4w9WgXcQ', list: 'PL9' }],
    ['youtu.be/dQw4w9WgXcQ', { videoId: 'dQw4w9WgXcQ' }],
    ['https://m.youtube.com/shorts/dQw4w9WgXcQ', { videoId: 'dQw4w9WgXcQ' }],
    ['https://youtube.com/live/dQw4w9WgXcQ?si=x', { videoId: 'dQw4w9WgXcQ' }],
  ])('%s', (url, expected) => {
    expect(parseYouTube(url)).toEqual({ url, videoId: undefined, list: undefined, ...expected })
  })

  test.each(['https://youtube.com/', 'https://notyoutube.com/watch?v=x', '25m', 'youtube is great'])('rejects %s', (text) => {
    expect(parseYouTube(text)).toBeNull()
  })
})

describe('parseSoundCloud', () => {
  test.each([
    ['https://soundcloud.com/artist/track?si=abc', { url: 'https://soundcloud.com/artist/track' }],
    ['https://m.soundcloud.com/artist/sets/mix', { url: 'https://soundcloud.com/artist/sets/mix', list: 'https://soundcloud.com/artist/sets/mix' }],
    ['soundcloud.com/artist', { url: 'https://soundcloud.com/artist', list: 'https://soundcloud.com/artist' }],
    ['https://soundcloud.com/artist/popular-tracks', { url: 'https://soundcloud.com/artist', list: 'https://soundcloud.com/artist' }],
    ['https://on.soundcloud.com/AbC12', { url: 'https://on.soundcloud.com/AbC12' }],
  ])('%s', (text, expected) => {
    expect(parseSoundCloud(text)).toEqual({ kind: 'soundcloud', ...expected })
  })

  test.each(['https://soundcloud.com/discover', 'https://soundcloud.com/', 'https://on.soundcloud.com/a/b', 'hello'])('rejects %s', (text) => {
    expect(parseSoundCloud(text)).toBeNull()
  })

  test('short links', () => {
    expect(isShortLink(parseSoundCloud('https://on.soundcloud.com/x')!)).toBe(true)
    expect(isShortLink(parseSoundCloud('https://soundcloud.com/x')!)).toBe(false)
  })
})

describe('voices', () => {
  const voice = (name: string, lang: string, extra: Partial<SpeechSynthesisVoice> = {}) =>
    ({ name, lang, voiceURI: name, default: false, localService: true, ...extra }) as SpeechSynthesisVoice
  const voices = [
    voice('Fred', 'en-US'),
    voice('Albert', 'en-US'),
    voice('Samantha', 'en-US', { default: true }),
    voice('Ava (Premium)', 'en-US'),
    voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US', { localService: false }),
    voice('Ioana', 'ro-RO'),
    voice('Daniel', 'en_GB'),
  ]

  test('English only, best sounding first, novelty voices dropped', () => {
    expect(rankVoices(voices).map(voiceName)).toEqual(['Aria', 'Ava', 'Samantha', 'Daniel'])
  })

  test('a saved voice wins when present', () => {
    expect(pickVoice(voices, 'Samantha')?.name).toBe('Samantha')
    expect(pickVoice(voices, 'Missing')?.name).toContain('Aria')
    expect(pickVoice(voices, 'Ioana')?.name).toContain('Aria')
    expect(pickVoice([voice('Ioana', 'ro-RO')])).toBeNull()
  })
})
