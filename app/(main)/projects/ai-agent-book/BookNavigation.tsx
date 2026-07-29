'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import {
  progressUpdatedEvent,
  readBookProgress,
  type StoredProgress,
} from '~/app/(main)/projects/ai-agent-book/progress-storage'
import { CheckDoubleTickIcon } from '~/assets'

type BookPage = {
  slug: string
  title: string
  progressChapter?: number
}

type BookSection = {
  depth: 2 | 3
  id: string
  title: string
}

function getBookHref(slug: string) {
  return `/projects/ai-agent-book/${slug}`
}

export function BookNavigation({
  pages,
  activeSlug,
  sections = [],
}: {
  pages: BookPage[]
  activeSlug?: string
  sections?: BookSection[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [progress, setProgress] = useState<StoredProgress>({ completed: {}, scrollDepth: {} })
  const [activeSectionId, setActiveSectionId] = useState<string>()
  const navigationLockUntil = useRef(0)

  useEffect(() => {
    const syncProgress = () => setProgress(readBookProgress())
    syncProgress()
    window.addEventListener('storage', syncProgress)
    window.addEventListener(progressUpdatedEvent, syncProgress)
    return () => {
      window.removeEventListener('storage', syncProgress)
      window.removeEventListener(progressUpdatedEvent, syncProgress)
    }
  }, [])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const expandOnSmallScreen = () => {
      if (!desktop.matches) setCollapsed(false)
    }
    expandOnSmallScreen()
    desktop.addEventListener('change', expandOnSmallScreen)
    return () => desktop.removeEventListener('change', expandOnSmallScreen)
  }, [])

  useEffect(() => {
    if (!activeSlug || sections.length === 0) {
      setActiveSectionId(undefined)
      return
    }

    let frame = 0
    const syncActiveSection = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (Date.now() < navigationLockUntil.current) return

        const readingOffset = 192
        const passedSections = sections.filter((section) => {
          const heading = document.getElementById(section.id)
          return heading && heading.getBoundingClientRect().top <= readingOffset
        })
        setActiveSectionId(passedSections[passedSections.length - 1]?.id)
      })
    }

    syncActiveSection()
    window.addEventListener('scroll', syncActiveSection, { passive: true })
    window.addEventListener('resize', syncActiveSection)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', syncActiveSection)
      window.removeEventListener('resize', syncActiveSection)
    }
  }, [activeSlug, sections])

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="展开目录"
        aria-expanded="false"
        title="展开目录"
        onClick={() => setCollapsed(false)}
        className="hidden h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-500 shadow-sm shadow-zinc-900/5 outline-offset-2 transition hover:bg-lime-50 hover:text-lime-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-600 dark:border-zinc-700/60 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-lime-400/15 dark:hover:text-lime-300 lg:inline-flex"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 rotate-180">
          <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )
  }

  return (
    <nav
      aria-label="本书目录"
      tabIndex={0}
      className="w-full overflow-x-hidden rounded-2xl border border-zinc-200 bg-white/70 p-2 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-600 dark:border-zinc-700/60 dark:bg-zinc-800/50 lg:max-h-[calc(100dvh-7rem)] lg:w-[17rem] lg:overflow-y-auto lg:overscroll-contain lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
    >
      <div className="sticky top-0 z-10 flex min-h-11 items-center justify-between gap-2 bg-white/95 px-2 backdrop-blur dark:bg-zinc-800/95">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">目录</p>
        <button
          type="button"
          aria-label="向左收起目录"
          aria-expanded="true"
          title="向左收起目录"
          onClick={() => setCollapsed(true)}
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-500 outline-offset-2 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-600 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-100 lg:inline-flex lg:shrink-0"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {pages.map((page) => {
          const active = page.slug === activeSlug
          const completed = Boolean(page.progressChapter && progress.completed[page.slug])
          return (
            <li key={page.slug}>
              <Link
                href={getBookHref(page.slug)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-start gap-2 rounded-lg px-2 py-2 text-sm transition ${active ? 'bg-lime-100 font-semibold text-lime-900 dark:bg-lime-400/15 dark:text-lime-300' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-100'}`}
              >
                <span className="min-w-0 flex-1">{page.title}</span>
                {completed && (
                  <span className="mt-0.5 inline-flex shrink-0 items-center text-lime-700 dark:text-lime-400" title="已完成本章">
                    <CheckDoubleTickIcon className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">已完成本章</span>
                  </span>
                )}
              </Link>
              {active && sections.length > 0 && (
                <ul aria-label={`${page.title} 章节目录`} className="my-1 ml-2 space-y-0.5 border-l border-zinc-200 py-1 pl-2 dark:border-zinc-700">
                  {sections.map((section) => (
                    <li key={section.id} className={section.depth === 3 ? 'ml-2' : ''}>
                      <a
                        href={`#${section.id}`}
                        aria-current={activeSectionId === section.id ? 'location' : undefined}
                        onClick={() => {
                          navigationLockUntil.current = Date.now() + 800
                          setActiveSectionId(section.id)
                        }}
                        className={`block rounded-md px-2 py-1.5 leading-5 outline-offset-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-600 ${section.depth === 3 ? 'text-[11px]' : 'text-xs'} ${activeSectionId === section.id ? 'bg-lime-100 font-semibold text-lime-900 dark:bg-lime-400/15 dark:text-lime-300' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-100'}`}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
