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
const cloudProgressAccountKey = 'boomoospace.ai-agent-book.progress.cloud-account.v1'
export const progressUpdatedEvent = 'boomoospace-ai-agent-book-progress-updated'

let queuedCloudProgress: StoredProgress | undefined
let cloudSaveTimer: number | undefined
let cloudSyncEnabled: boolean | undefined

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
  saveBookProgress(progress)
  window.dispatchEvent(new CustomEvent<BookProgressUpdate>(progressUpdatedEvent, { detail: update }))
}

export function saveBookProgress(progress: StoredProgress) {
  window.localStorage.setItem(progressStorageKey, JSON.stringify(progress))
  queueCloudSave(progress)
}

function isSameProgress(left: StoredProgress, right: StoredProgress) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function mergeInitialProgress(local: StoredProgress, cloud: StoredProgress): StoredProgress {
  const mergeCompleted = (localValues: Record<string, boolean>, cloudValues: Record<string, boolean>) =>
    Object.fromEntries(
      [...new Set([...Object.keys(cloudValues), ...Object.keys(localValues)])].map((key) => [
        key,
        Boolean(cloudValues[key] || localValues[key]),
      ])
    )

  return {
    completed: mergeCompleted(local.completed, cloud.completed),
    completedSections: mergeCompleted(local.completedSections, cloud.completedSections),
    scrollDepth: Object.fromEntries(
      [...new Set([...Object.keys(cloud.scrollDepth), ...Object.keys(local.scrollDepth)])].map((key) => [
        key,
        Math.max(cloud.scrollDepth[key] || 0, local.scrollDepth[key] || 0),
      ])
    ),
    lastRead: local.lastRead || cloud.lastRead,
  }
}

async function saveProgressToCloud(progress: StoredProgress) {
  if (cloudSyncEnabled === false) return false
  const response = await fetch('/api/ai-agent-book/progress', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ progress }),
  })
  if (response.status === 401) cloudSyncEnabled = false
  return response.ok
}

function queueCloudSave(progress: StoredProgress) {
  queuedCloudProgress = progress
  window.clearTimeout(cloudSaveTimer)
  cloudSaveTimer = window.setTimeout(() => {
    const pending = queuedCloudProgress
    queuedCloudProgress = undefined
    if (!pending) return
    void saveProgressToCloud(pending)
  }, 700)
}

export async function hydrateBookProgress() {
  const localProgress = readBookProgress()

  try {
    const response = await fetch('/api/ai-agent-book/progress')
    if (!response.ok) return localProgress

    const payload = (await response.json()) as {
      authenticated: boolean
      progress: StoredProgress | null
      userId?: string
    }
    if (!payload.authenticated || !payload.userId) {
      cloudSyncEnabled = false
      return localProgress
    }

    cloudSyncEnabled = true
    window.clearTimeout(cloudSaveTimer)
    queuedCloudProgress = undefined

    const knownAccount = window.localStorage.getItem(cloudProgressAccountKey)
    const cloudProgress = payload.progress
    const nextProgress = cloudProgress
      ? knownAccount === payload.userId
        ? cloudProgress
        : mergeInitialProgress(localProgress, cloudProgress)
      : localProgress

    window.localStorage.setItem(cloudProgressAccountKey, payload.userId)
    if (!isSameProgress(localProgress, nextProgress)) {
      window.localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress))
      window.dispatchEvent(new CustomEvent(progressUpdatedEvent))
    }

    if (!cloudProgress || !isSameProgress(cloudProgress, nextProgress)) {
      const saved = await saveProgressToCloud(nextProgress)
      if (!saved) window.localStorage.removeItem(cloudProgressAccountKey)
    }

    return nextProgress
  } catch {
    return localProgress
  }
}
