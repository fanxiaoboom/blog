'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  progressStorageKey,
  progressUpdatedEvent,
  readBookProgress,
  type StoredProgress,
} from '~/app/(main)/projects/ai-agent-book/progress-storage'
import { Button } from '~/components/ui/Button'

type ProgressChapter = {
  slug: string
  title: string
  href: string
}

export function LearningProgress({
  chapters,
  currentSlug,
}: {
  chapters: ProgressChapter[]
  currentSlug?: string
}) {
  const [progress, setProgress] = useState<StoredProgress>({
    completed: {},
    scrollDepth: {},
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProgress(readBookProgress())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || !currentSlug) return
    setProgress((current) => ({ ...current, lastRead: currentSlug }))
  }, [currentSlug, ready])

  useEffect(() => {
    if (!ready) return
    window.localStorage.setItem(progressStorageKey, JSON.stringify(progress))
    window.dispatchEvent(new Event(progressUpdatedEvent))
  }, [progress, ready])

  useEffect(() => {
    if (!ready || !currentSlug) return

    let timeout: number | undefined
    const updateDepth = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        const depth = Math.min(100, Math.round((window.scrollY / available) * 100))
        setProgress((current) => {
          if (depth <= (current.scrollDepth[currentSlug] || 0)) return current
          return {
            ...current,
            scrollDepth: { ...current.scrollDepth, [currentSlug]: depth },
          }
        })
      }, 200)
    }

    updateDepth()
    window.addEventListener('scroll', updateDepth, { passive: true })
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('scroll', updateDepth)
    }
  }, [currentSlug, ready])

  const completedCount = useMemo(
    () => chapters.filter((chapter) => progress.completed[chapter.slug]).length,
    [chapters, progress.completed]
  )
  const percent = Math.round((completedCount / chapters.length) * 100)
  const currentChapter = chapters.find((chapter) => chapter.slug === currentSlug)
  const resume = chapters.find((chapter) => chapter.slug === progress.lastRead)

  const toggleCurrentChapter = () => {
    if (!currentSlug) return
    setProgress((current) => ({
      ...current,
      completed: {
        ...current.completed,
        [currentSlug]: !current.completed[currentSlug],
      },
    }))
  }

  return (
    <section
      aria-label="学习进度"
      className="not-prose my-8 rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm shadow-zinc-900/5 dark:border-zinc-700/60 dark:bg-zinc-800/50"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">学习进度</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            已完成 {completedCount} / {chapters.length} 章
            {currentChapter && progress.scrollDepth[currentSlug || '']
              ? ` · 本章已阅读 ${progress.scrollDepth[currentSlug || '']}%`
              : ''}
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-lime-700 dark:text-lime-400">{percent}%</p>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
        role="progressbar"
        aria-label="书籍完成进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-lime-500 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {currentChapter && (
          <Button onClick={toggleCurrentChapter} aria-pressed={Boolean(progress.completed[currentSlug || ''])}>
            {progress.completed[currentSlug || ''] ? '已完成本章' : '标记本章完成'}
          </Button>
        )}
        {resume && resume.slug !== currentSlug && (
          <Button href={resume.href} variant="secondary">
            继续阅读
          </Button>
        )}
      </div>
      {!ready && <p className="mt-3 text-xs text-zinc-500">正在读取本机学习进度…</p>}
    </section>
  )
}
