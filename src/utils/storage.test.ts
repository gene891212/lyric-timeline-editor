import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGACY_STORAGE_KEY, PROJECT_STORAGE_KEY, loadProject } from './storage'

const values = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
}

describe('project storage migration', () => {
  beforeEach(() => {
    values.clear()
    vi.stubGlobal('window', { localStorage: localStorageMock })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('migrates the legacy LRC localStorage value to the versioned project format', () => {
    values.set(LEGACY_STORAGE_KEY, '[ti:Legacy]\n[ar:Artist]\n[00:01.00]Hello')

    const project = loadProject()

    expect(project?.version).toBe(1)
    expect(project?.metadata).toMatchObject({ title: 'Legacy', artist: 'Artist' })
    expect(project?.lines[0]).toMatchObject({ text: 'Hello', startMs: 1000 })
    expect(values.has(PROJECT_STORAGE_KEY)).toBe(true)
  })
})
