export type MediaMode = 'none' | 'youtube' | 'local'
export type ExportFormat = 'lrc' | 'srt'

export type Metadata = {
  title: string
  artist: string
  album: string
}

export type LyricLine = {
  id: string
  text: string
  startMs: number | null
  endMs: number | null
}

export type Project = {
  version: 1
  metadata: Metadata
  lines: LyricLine[]
  activeLineId: string | null
  playbackRate: number
}

export const emptyMetadata = (): Metadata => ({
  title: '',
  artist: '',
  album: '',
})

export const createLineId = (prefix = 'line') => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const cloneLines = (lines: LyricLine[]): LyricLine[] =>
  lines.map((line) => ({ ...line }))

export const cloneProject = (project: Project): Project => ({
  ...project,
  metadata: { ...project.metadata },
  lines: cloneLines(project.lines),
})

export const createProject = (lines: LyricLine[] = []): Project => ({
  version: 1,
  metadata: emptyMetadata(),
  lines: cloneLines(lines),
  activeLineId: lines[0]?.id ?? null,
  playbackRate: 1,
})
