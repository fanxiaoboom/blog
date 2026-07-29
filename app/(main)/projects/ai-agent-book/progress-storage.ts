'use client'

export type StoredProgress = {
  completed: Record<string, boolean>
  scrollDepth: Record<string, number>
  lastRead?: string
}

export const progressStorageKey = 'boomoospace.ai-agent-book.progress.v1'
export const progressUpdatedEvent = 'boomoospace-ai-agent-book-progress-updated'

export function readBookProgress(): StoredProgress {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(progressStorageKey) || '{}')
    return {
      completed: parsed.completed || {},
      scrollDepth: parsed.scrollDepth || {},
      lastRead: parsed.lastRead,
    }
  } catch {
    return { completed: {}, scrollDepth: {} }
  }
}
