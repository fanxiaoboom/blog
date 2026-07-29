'use client'

export type StoredProgress = {
  completed: Record<string, boolean>
  completedSections: Record<string, boolean>
  scrollDepth: Record<string, number>
  lastRead?: string
}

export type BookProgressUpdate = {
  chapterCompleted?: boolean
  chapterSlug?: string
}

export const progressStorageKey = 'boomoospace.ai-agent-book.progress.v1'
export const progressUpdatedEvent = 'boomoospace-ai-agent-book-progress-updated'

export function readBookProgress(): StoredProgress {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(progressStorageKey) || '{}')
    return {
      completed: parsed.completed || {},
      completedSections: parsed.completedSections || {},
      scrollDepth: parsed.scrollDepth || {},
      lastRead: parsed.lastRead,
    }
  } catch {
    return { completed: {}, completedSections: {}, scrollDepth: {} }
  }
}

export function persistBookProgress(progress: StoredProgress, update?: BookProgressUpdate) {
  window.localStorage.setItem(progressStorageKey, JSON.stringify(progress))
  window.dispatchEvent(new CustomEvent<BookProgressUpdate>(progressUpdatedEvent, { detail: update }))
}
