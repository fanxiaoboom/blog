'use client'

import { useEffect, useState } from 'react'

const revealAfter = 480

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)

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

  const scrollToTop = () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      aria-label="回到顶部"
      title="回到顶部"
      onClick={scrollToTop}
      className={`fixed bottom-20 right-5 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-500 shadow-sm shadow-zinc-900/10 backdrop-blur transition-[opacity,transform,background-color,color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-lime-50 hover:text-lime-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-600 focus-visible:outline-offset-2 motion-reduce:transition-none dark:border-zinc-700/60 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-lime-400/15 dark:hover:text-lime-300 sm:bottom-6 sm:right-20 ${visible ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="m6 14 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
