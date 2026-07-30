'use client'

import { useEffect, useRef, useState } from 'react'

const revealAfter = 320
const hideAfter = 900

export function BackToTopButton() {
  const [visible, setVisible] = useState(false)
  const hideTimeout = useRef<number>()

  useEffect(() => {
    let frame = 0
    const syncVisibility = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const shouldShow = window.scrollY > revealAfter
        setVisible(shouldShow)
        window.clearTimeout(hideTimeout.current)
        if (shouldShow) {
          hideTimeout.current = window.setTimeout(() => setVisible(false), hideAfter)
        }
      })
    }

    window.addEventListener('scroll', syncVisibility, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(hideTimeout.current)
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
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      title="回到顶部"
      onClick={scrollToTop}
      className={`fixed bottom-[4.75rem] right-5 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-lime-200 bg-lime-50 text-lime-800 shadow-md shadow-lime-900/10 transition-[opacity,transform,background-color,box-shadow] duration-200 ease-out hover:scale-105 hover:bg-lime-100 hover:opacity-100 hover:shadow-lg hover:shadow-lime-900/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-600 focus-visible:outline-offset-2 focus-visible:opacity-100 motion-reduce:transition-none dark:border-lime-400/30 dark:bg-lime-400/15 dark:text-lime-300 dark:hover:bg-lime-400/25 sm:bottom-20 sm:right-6 ${visible ? 'scale-100 opacity-70' : 'pointer-events-none scale-90 opacity-0'}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="m6 14 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
