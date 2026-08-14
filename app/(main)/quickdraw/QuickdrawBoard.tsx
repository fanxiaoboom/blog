'use client'

import {
  type GridId,
  Quickdraw,
  type QuickdrawRef,
  type Snapshot,
  useQuickdrawStore,
} from '@quickdrawjs/react'
import Link from 'next/link'
import React from 'react'

const STORAGE_KEY = 'boomoospace:quickdraw:snapshot:v1'

type BoardTheme = 'light' | 'dark'

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false
  const document = (value as Record<string, unknown>).document
  return Boolean(
    document &&
    typeof document === 'object' &&
    (document as Record<string, unknown>).store &&
    typeof (document as Record<string, unknown>).store === 'object'
  )
}

const gridOptions: Array<{ value: GridId; label: string }> = [
  { value: 'dots', label: '点阵' },
  { value: 'lines', label: '横线' },
  { value: 'none', label: '纯色' },
]

function buttonClass(primary = false) {
  return [
    'inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-zinc-900',
    primary
      ? 'bg-lime-500 text-lime-950 shadow-sm shadow-lime-500/30 hover:bg-lime-400 active:bg-lime-600'
      : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
  ].join(' ')
}

export function QuickdrawBoard() {
  const board = React.useRef<QuickdrawRef>(null)
  const stage = React.useRef<HTMLDivElement>(null)
  const store = useQuickdrawStore()
  const saveTimer = React.useRef<number>()
  const [theme, setTheme] = React.useState<BoardTheme>('light')
  const [grid, setGrid] = React.useState<GridId>('dots')
  const [status, setStatus] = React.useState('正在准备画布…')
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [confirmClear, setConfirmClear] = React.useState(false)

  const persist = React.useCallback(() => {
    const editor = board.current?.editor
    if (!editor) return

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(editor.store.getSnapshot())
      )
      setStatus('已保存到这台设备')
    } catch {
      setStatus('无法保存到这台设备；请导出 PNG 留存')
    }
  }, [])

  const handleMount = React.useCallback(
    (editor: NonNullable<QuickdrawRef['editor']>) => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const snapshot: unknown = JSON.parse(raw)
          if (!isSnapshot(snapshot)) throw new Error('Invalid local snapshot')
          editor.store.loadSnapshot(snapshot, 'remote')
          editor.fitContent({ animate: 0 })
          setStatus('已恢复这台设备上的草图')
        } else {
          setStatus('本机自动保存已开启')
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
        setStatus('开始一张新画布；本机自动保存已开启')
      }
    },
    []
  )

  const handleChange = React.useCallback(() => {
    window.clearTimeout(saveTimer.current)
    setStatus('正在保存…')
    saveTimer.current = window.setTimeout(persist, 500)
  }, [persist])

  React.useEffect(() => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(dark ? 'dark' : 'light')

    const syncFullscreen = () =>
      setIsFullscreen(document.fullscreenElement === stage.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => {
      window.clearTimeout(saveTimer.current)
      document.removeEventListener('fullscreenchange', syncFullscreen)
    }
  }, [])

  const choosePen = () => {
    board.current?.editor?.setTool('draw')
    board.current?.editor?.container.focus()
    setStatus('画笔已就绪')
  }

  const fitContent = () => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    board.current?.editor?.fitContent({ animate: reduceMotion ? 0 : 220 })
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await stage.current?.requestFullscreen()
      }
    } catch {
      setStatus('全屏模式不可用；可继续在当前窗口绘制')
    }
  }

  const download = async () => {
    const blob = await board.current?.editor?.exportImage({
      background: theme === 'light',
      scale: 2,
    })
    if (!blob) {
      setStatus('画布还是空的，先画点什么再导出吧')
      return
    }
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `boomoospace-quickdraw-${new Date().toISOString().slice(0, 10)}.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(href), 5_000)
    setStatus('PNG 已开始下载')
  }

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setStatus('再次点按“确认清空”即可；仍可用撤销找回')
      return
    }
    board.current?.editor?.store.clear()
    window.localStorage.removeItem(STORAGE_KEY)
    setConfirmClear(false)
    setStatus('画布已清空；可用撤销恢复')
  }

  return (
    <section className="quickdraw-shell">
      <Link
        href="/projects"
        className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-500 underline-offset-4 hover:text-lime-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 dark:text-zinc-400 dark:hover:text-lime-400"
      >
        返回项目
      </Link>

      <div className="mt-4 flex flex-col gap-5 border-b border-zinc-200 pb-7 dark:border-zinc-700 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-lime-700 dark:text-lime-400">
            BOOMOOSPACE PLAYGROUND
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            QuickDraw 画布
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300">
            一张会自动记住你的无限画布。用手指、鼠标或触控笔随手画，也可以放进图片、便签和箭头。
          </p>
        </div>
        <p
          aria-live="polite"
          className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          {status}
        </p>
      </div>

      <div
        className="mt-5 flex flex-wrap items-center gap-2"
        aria-label="画布控制"
      >
        <button type="button" className={buttonClass(true)} onClick={choosePen}>
          开始绘制
        </button>
        <button type="button" className={buttonClass()} onClick={fitContent}>
          适配画布
        </button>
        <button type="button" className={buttonClass()} onClick={download}>
          导出 PNG
        </button>
        <button
          type="button"
          className={buttonClass()}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? '退出全屏' : '全屏绘制'}
        </button>
        <button
          type="button"
          className={buttonClass()}
          onClick={() =>
            setTheme((current) => (current === 'light' ? 'dark' : 'light'))
          }
          aria-pressed={theme === 'dark'}
        >
          {theme === 'light' ? '切换深色画布' : '切换浅色画布'}
        </button>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          <span>网格</span>
          <select
            aria-label="画布网格"
            value={grid}
            onChange={(event) => setGrid(event.target.value as GridId)}
            className="min-h-8 bg-transparent text-sm font-medium outline-none"
          >
            {gridOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        ref={stage}
        data-board-theme={theme}
        className="quickdraw-stage relative mt-5 h-[min(68dvh,44rem)] min-h-[32rem] overflow-hidden rounded-2xl border border-zinc-200 bg-[#fbf9f4] shadow-xl shadow-zinc-900/5 dark:border-zinc-700 dark:bg-[#191713]"
      >
        <button
          type="button"
          className={`quickdraw-fullscreen-exit absolute z-[60] hidden min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold shadow-lg outline-none backdrop-blur transition focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 ${
            theme === 'dark'
              ? 'border-white/15 bg-zinc-900/90 text-white hover:bg-zinc-800 focus-visible:ring-offset-zinc-900'
              : 'border-zinc-900/10 bg-white/90 text-zinc-800 hover:bg-white focus-visible:ring-offset-white'
          }`}
          onClick={toggleFullscreen}
        >
          退出全屏
        </button>
        <Quickdraw
          ref={board}
          store={store}
          theme={theme}
          grid={grid}
          themeToggle={false}
          gridControl={false}
          autoFit
          onMount={handleMount}
          onChange={handleChange}
          onThemeChange={(nextTheme) => setTheme(nextTheme as BoardTheme)}
          onGridChange={setGrid}
          className="qd-root quickdraw-board"
        />
      </div>

      <div className="mt-4 flex flex-col justify-between gap-4 text-sm text-zinc-600 dark:text-zinc-300 sm:flex-row sm:items-center">
        <p>
          快捷键：
          <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-600">
            D
          </kbd>{' '}
          画笔，
          <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-600">
            Space
          </kbd>{' '}
          平移，
          <kbd className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-600">
            ⌘Z
          </kbd>{' '}
          撤销。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {confirmClear && <span id="clear-hint">此操作可撤销</span>}
          <button
            type="button"
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700 outline-none transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/30"
            onClick={clear}
            aria-describedby={confirmClear ? 'clear-hint' : undefined}
          >
            {confirmClear ? '确认清空' : '清空画布'}
          </button>
        </div>
      </div>
    </section>
  )
}
