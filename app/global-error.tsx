'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-2xl font-bold">页面加载出错</h1>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            抱歉，网站遇到了意外问题。请尝试刷新页面，或清除浏览器缓存后重试。
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
              刷新
            </button>
          </div>
          {error.digest && (
            <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-600">
              Error digest: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
