import { parseLyrics } from './lyric-format'
import { cloneProject, createProject, emptyMetadata, type Project } from '../types'

export const PROJECT_STORAGE_KEY = 'lyric_editor_project_v1'
export const LEGACY_STORAGE_KEY = 'lyric_editor_save'

const isProject = (value: unknown): value is Project => {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<Project>
  return (
    project.version === 1 &&
    Array.isArray(project.lines) &&
    !!project.metadata &&
    typeof project.metadata === 'object'
  )
}

export const saveProject = (project: Project) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(cloneProject(project)))
}

export const loadProject = (): Project | null => {
  if (typeof window === 'undefined') return null
  const rawProject = window.localStorage.getItem(PROJECT_STORAGE_KEY)
  if (rawProject) {
    try {
      const parsed = JSON.parse(rawProject) as unknown
      if (isProject(parsed)) return parsed
    } catch {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY)
    }
  }

  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return null
  const parsed = parseLyrics(legacy)
  const project = createProject(parsed.lines)
  project.metadata = { ...emptyMetadata(), ...parsed.metadata }
  saveProject(project)
  return project
}
