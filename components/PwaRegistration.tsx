'use client'

import { useEffect } from 'react'

export function PwaRegistration() {
  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const standalone =
      standaloneQuery.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    document.documentElement.classList.toggle('pwa-standalone', standalone)

    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return () => document.documentElement.classList.remove('pwa-standalone')
    }

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register, { once: true })
    return () => {
      window.removeEventListener('load', register)
      document.documentElement.classList.remove('pwa-standalone')
    }
  }, [])

  return null
}
