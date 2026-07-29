'use client'

import { useEffect, useState } from 'react'

const revealAfter = 480
const navigationLayoutEvent = 'boomoospace-ai-agent-book-navigation-layout-change'

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)
  const [left, setLeft] = useState<number>()

  useEffect(() => {
    let frame = 0
    const syncVisibility = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        setVisible(window.scrollY > revealAfter)
      })
    }

    syncVisibility()
    window.addEventListener('scroll', syncVisibility, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', syncVisibility)
    }
  }, [])

  useEffect(() => {
    const article = document.querySelector<HTMLElement>('[data-book-reader-article]')
    if (!article) return

    let frame = 0
    const syncPosition = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const articleRect = article.getBoundingClientRect()
        // Sit just outside the reading column. Clamp it inside the viewport
        // for narrow layouts, then recalculate whenever the TOC changes width.
        setLeft(Math.min(window.innerWidth - 60, Math.max(16, articleRect.right + 16)))
      })
    }

    const observer = new ResizeObserver(syncPosition)
    observer.observe(article)
    syncPosition()
    window.addEventListener('resize', syncPosition)
    window.addEventListener(navigationLayoutEvent, syncPosition)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener(navigationLayoutEvent, syncPosition)
    }
  }, [])

  const scrollToTop = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      aria-label="回到顶部"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      title="回到顶部"
      onClick={scrollToTop}
      style={left === undefined ? undefined : { left }}
      className={`fixed top-1/2 z-[60] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/70 bg-white/55 text-zinc-400 shadow-sm shadow-zinc-900/5 backdrop-blur transition-[opacity,transform,background-color,color] duration-200 ease-out hover:scale-105 hover:bg-lime-50/80 hover:text-lime-800 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-600 focus-visible:outline-offset-2 motion-reduce:transition-none dark:border-zinc-700/50 dark:bg-zinc-800/55 dark:text-zinc-500 dark:hover:bg-lime-400/15 dark:hover:text-lime-300 ${visible ? 'scale-100 opacity-60' : 'pointer-events-none scale-90 opacity-0'}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="m6 14 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
