import { describe, expect, it } from 'vitest'
import {
  buildLrc,
  buildSrt,
  formatLrcTime,
  formatSrtTime,
  parseLyrics,
  parseLrcTime,
  parseSrtTime,
} from './lyric-format'

describe('lyric format helpers', () => {
  it('parses LRC metadata and multiple timestamps', () => {
    const result = parseLyrics('[ti:Demo]\n[ar:Artist]\n[00:01.20][00:02.50]hello')
    expect(result.format).toBe('lrc')
    expect(result.metadata.title).toBe('Demo')
    expect(result.lines.map((line) => line.startMs)).toEqual([1200, 2500])
  })

  it('parses SRT start and end times', () => {
    const result = parseLyrics('1\n00:00:01,250 --> 00:00:03,500\nHello')
    expect(result.lines[0]).toMatchObject({ startMs: 1250, endMs: 3500, text: 'Hello' })
    expect(parseSrtTime('00:01:02,030')).toBe(62030)
  })

  it('keeps plain text untimed', () => {
    const result = parseLyrics('one\ntwo')
    expect(result.format).toBe('txt')
    expect(result.lines.every((line) => line.startMs === null && line.endMs === null)).toBe(true)
  })

  it('formats LRC and SRT precision consistently', () => {
    expect(parseLrcTime('1', '02', '34')).toBe(62340)
    expect(formatLrcTime(62340)).toBe('[01:02.34]')
    expect(formatSrtTime(62340)).toBe('00:01:02,340')
  })

  it('builds both export formats from shared lines', () => {
    const parsed = parseLyrics('[ti:Demo]\n[00:00.00]One\n[00:02.00]Two')
    expect(buildLrc(parsed.lines, parsed.metadata)).toContain('[ti:Demo]')
    expect(buildSrt(parsed.lines)).toContain('00:00:00,000 --> 00:00:02,000')
  })
})
