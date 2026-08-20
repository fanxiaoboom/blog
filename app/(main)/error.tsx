'use client'

import { useEffect } from 'react'

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Main layout error:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-3 text-xl font-bold">内容加载失败</h2>
      <p className="mb-6 max-w-md text-zinc-600 dark:text-zinc-400">
        这部分内容暂时无法显示。可能是网络或第三方服务（如 Clerk、Sanity）加载失败导致的。
      </p>
      <div className="flex justify-center gap-3">
        <button
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-lime-400 dark:text-zinc-950 dark:hover:bg-lime-300"
          onClick={() => reset()}
          type="button"
        >
          重试
        </button>
        <button
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          onClick={() => window.location.reload()}
          type="button"
        >
          刷新页面
        </button>
      </div>
    </div>
  )
}
