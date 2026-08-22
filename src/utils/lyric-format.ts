import { createLineId, emptyMetadata, type LyricLine, type Metadata } from '../types'

export const MIN_DURATION_MS = 300
export const DEFAULT_LAST_DURATION_MS = 3000

export type ParsedLyrics = {
  format: 'lrc' | 'srt' | 'txt'
  metadata: Metadata
  lines: LyricLine[]
}

const makeId = (prefix: string, index: number, startMs: number | null) =>
  `${prefix}-${index}-${startMs ?? 'untimed'}`

export const parseSrtTime = (raw: string): number | null => {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/)
  if (!match) return null
  const [, hh, mm, ss, fraction] = match
  return (
    Number(hh) * 3600000 +
    Number(mm) * 60000 +
    Number(ss) * 1000 +
    Number(fraction.padEnd(3, '0'))
  )
}

export const formatSrtTime = (ms: number): string => {
  const safeMs = Math.max(0, Math.round(ms))
  const hh = Math.floor(safeMs / 3600000)
  const mm = Math.floor((safeMs % 3600000) / 60000)
  const ss = Math.floor((safeMs % 60000) / 1000)
  const mss = safeMs % 1000
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(
    ss,
  ).padStart(2, '0')},${String(mss).padStart(3, '0')}`
}

export const parseLrcTime = (minutes: string, seconds: string, fraction = '') => {
  const fractionMs = fraction
    ? Number(fraction.slice(0, 3).padEnd(3, '0'))
    : 0
  return Number(minutes) * 60000 + Number(seconds) * 1000 + fractionMs
}

export const formatLrcTime = (ms: number): string => {
  const safeMs = Math.max(0, Math.round(ms))
  const minutes = Math.floor(safeMs / 60000)
  const seconds = Math.floor((safeMs % 60000) / 1000)
  const centiseconds = Math.floor((safeMs % 1000) / 10)
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(centiseconds).padStart(2, '0')}]`
}

export const formatClock = (ms: number): string => {
  const safeMs = Math.max(0, Math.round(ms))
  const minutes = Math.floor(safeMs / 60000)
  const seconds = Math.floor((safeMs % 60000) / 1000)
  const centiseconds = Math.floor((safeMs % 1000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(centiseconds).padStart(2, '0')}`
}

const getEndFor = (startMs: number, nextStartMs: number | undefined) =>
  nextStartMs === undefined
    ? startMs + DEFAULT_LAST_DURATION_MS
    : Math.max(startMs + MIN_DURATION_MS, nextStartMs)

export const parseSrt = (content: string): ParsedLyrics => {
  const blocks = content
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
  const lines: LyricLine[] = []

  blocks.forEach((block, blockIndex) => {
    const rows = block.split('\n')
    const timeIndex = rows.findIndex((row) => row.includes('-->'))
    if (timeIndex < 0) return
    const [startRaw, endRaw] = rows[timeIndex].split('-->').map((part) => part.trim())
    const startMs = parseSrtTime(startRaw)
    const endMs = parseSrtTime(endRaw)
    if (startMs === null || endMs === null || endMs <= startMs) return
    const text = rows
      .filter((_, index) => index !== timeIndex && !/^\d+$/.test(rows[index].trim()))
      .join('\n')
      .trim()
    lines.push({
      id: makeId('srt', blockIndex, startMs),
      text,
      startMs,
      endMs,
    })
  })

  return { format: 'srt', metadata: emptyMetadata(), lines }
}

export const parseLrc = (content: string): ParsedLyrics => {
  const metadata = emptyMetadata()
  const timedRows: Array<{ timeMs: number; text: string; index: number }> = []
  const untimedRows: Array<{ text: string; index: number }> = []
  const lines = content.replace(/\r/g, '').split('\n')
  const metadataPattern = /^\[(ti|ar|al):\s*(.*?)\]\s*$/i
  const metadataKeyMap: Record<'ti' | 'ar' | 'al', keyof Metadata> = {
    ti: 'title',
    ar: 'artist',
    al: 'album',
  }
  const timePattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim()
    if (!line) return
    const metadataMatch = line.match(metadataPattern)
    if (metadataMatch) {
      const key = metadataKeyMap[metadataMatch[1].toLowerCase() as 'ti' | 'ar' | 'al']
      metadata[key] = metadataMatch[2].trim()
      return
    }

    const matches = [...line.matchAll(timePattern)]
    if (matches.length === 0) {
      untimedRows.push({ text: line, index })
      return
    }
    const text = line.replace(timePattern, '').trim()
    matches.forEach((match) => {
      const [, minutes, seconds, fraction = ''] = match
      timedRows.push({
        timeMs: parseLrcTime(minutes, seconds, fraction),
        text,
        index,
      })
    })
  })

  timedRows.sort((a, b) => a.index - b.index || a.timeMs - b.timeMs)
  const linesInSourceOrder = [
    ...timedRows.map((row, index) => ({
      id: makeId('lrc', index, row.timeMs),
      text: row.text,
      startMs: row.timeMs,
      endMs: getEndFor(row.timeMs, timedRows[index + 1]?.timeMs),
      sourceIndex: row.index,
    })),
    ...untimedRows.map((row, index) => ({
      id: makeId('lrc-text', index, null),
      text: row.text,
      startMs: null,
      endMs: null,
      sourceIndex: row.index,
    })),
  ]
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
    .map(({ sourceIndex: _, ...line }) => line)

  return { format: 'lrc', metadata, lines: linesInSourceOrder }
}

export const parsePlainLyrics = (content: string): ParsedLyrics => {
  const lines = content
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: makeId('txt', index, null),
      text,
      startMs: null,
      endMs: null,
    }))
  return { format: 'txt', metadata: emptyMetadata(), lines }
}

export const parseLyrics = (content: string): ParsedLyrics => {
  const normalized = content.trim()
  if (!normalized) return parsePlainLyrics('')
  if (normalized.includes('-->')) return parseSrt(normalized)
  if (/\[(?:ti|ar|al):|\[\d{1,3}:\d{2}/i.test(normalized)) return parseLrc(normalized)
  return parsePlainLyrics(normalized)
}

export const sortLinesForDisplay = (lines: LyricLine[]) =>
  [...lines].sort((a, b) => {
    if (a.startMs === null && b.startMs === null) return 0
    if (a.startMs === null) return 1
    if (b.startMs === null) return -1
    return a.startMs - b.startMs
  })

export const buildLrc = (lines: LyricLine[], metadata: Metadata): string => {
  const output: string[] = []
  if (metadata.title) output.push(`[ti:${metadata.title}]`)
  if (metadata.artist) output.push(`[ar:${metadata.artist}]`)
  if (metadata.album) output.push(`[al:${metadata.album}]`)
  lines.forEach((line) => {
    output.push(line.startMs === null ? line.text : `${formatLrcTime(line.startMs)}${line.text}`)
  })
  return output.join('\n')
}

export const buildSrt = (lines: LyricLine[]): string => {
  const timed = lines.filter((line) => line.startMs !== null)
  return timed
    .map((line, index) => {
      const startMs = line.startMs ?? 0
      const nextStart = timed[index + 1]?.startMs ?? undefined
      const endMs = Math.max(
        startMs + MIN_DURATION_MS,
        line.endMs ?? getEndFor(startMs, nextStart),
      )
      return `${index + 1}\n${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n${line.text}`
    })
    .join('\n\n')
}

export const createLinesFromText = (content: string) => parseLyrics(content).lines

export const updateDerivedEndTimes = (lines: LyricLine[]): LyricLine[] => {
  const timed = lines.filter((line) => line.startMs !== null)
  return lines.map((line) => {
    if (line.startMs === null) return { ...line, endMs: null }
    const next = timed[timed.indexOf(line) + 1]
    const fallback = line.endMs ?? getEndFor(line.startMs, next?.startMs ?? undefined)
    return { ...line, endMs: Math.max(line.startMs + MIN_DURATION_MS, fallback) }
  })
}

export const isTimedLine = (line: LyricLine): line is LyricLine & { startMs: number; endMs: number } =>
  line.startMs !== null && line.endMs !== null

export const ensureLine = (value: Partial<LyricLine>, index: number): LyricLine => ({
  id: value.id ?? createLineId(`line-${index}`),
  text: value.text ?? '',
  startMs: typeof value.startMs === 'number' ? value.startMs : null,
  endMs: typeof value.endMs === 'number' ? value.endMs : null,
})
