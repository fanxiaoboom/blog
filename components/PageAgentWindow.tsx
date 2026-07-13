'use client'

import type { FormEvent, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import { SparkleIcon, XIcon } from '~/assets'

type AgentResult = {
  data?: string
  success?: boolean
}

type PageAgentInstance = {
  execute: (instruction: string) => Promise<AgentResult>
  dispose?: () => void
  panel?: {
    hide: () => void
  }
}

const PANEL_GUTTER = 16
const DEMO_AGENT_CONFIG = {
  apiKey: 'NA',
  baseURL: 'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run',
  model: 'qwen3.5-plus',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function PageAgentWindow() {
  const agentRef = useRef<PageAgentInstance | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  )
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'running' | 'error'>(
    'loading',
  )
  const [response, setResponse] = useState(
    '我是 O-mos，可以帮你浏览页面、打开文章或切换页面。',
  )

  useEffect(() => {
    let disposed = false

    async function initialiseAgent() {
      try {
        const { PageAgent } = await import('page-agent')
        if (disposed) return

        const agent = new PageAgent({
          ...DEMO_AGENT_CONFIG,
          language: 'zh-CN',
          instructions: {
            system:
              '你是这个个人主页的导航助手。帮助访客浏览内容、打开文章和在页面中定位信息。仅执行与浏览和导航有关的请求；如请求涉及外部服务、订阅或其他不可逆操作，先征得用户确认。',
          },
        })

        agent.panel.hide()
        agentRef.current = agent
        setStatus('ready')
      } catch {
        if (disposed) return
        setStatus('error')
        setResponse('Page Agent 初始化失败，请刷新后重试。')
      }
    }

    void initialiseAgent()

    return () => {
      disposed = true
      agentRef.current?.dispose?.()
      agentRef.current = null
    }
  }, [])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia('(max-width: 639px)').matches) return

    const panel = event.currentTarget.parentElement
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    setPosition({ left: rect.left, top: rect.top })
    isDraggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return

    const panel = event.currentTarget.parentElement
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    setPosition({
      left: clamp(
        event.clientX - dragOffsetRef.current.x,
        PANEL_GUTTER,
        window.innerWidth - rect.width - PANEL_GUTTER,
      ),
      top: clamp(
        event.clientY - dragOffsetRef.current.y,
        PANEL_GUTTER,
        window.innerHeight - rect.height - PANEL_GUTTER,
      ),
    })
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const instruction = input.trim()
    if (!instruction || status === 'running') return

    if (!agentRef.current) {
      setStatus('error')
      setResponse('Agent 尚未就绪，请稍候再试。')
      return
    }

    setInput('')
    setStatus('running')
    setResponse('正在处理你的请求…')

    try {
      const result = await agentRef.current.execute(instruction)
      setResponse(
        result.data ||
          (result.success ? '已完成请求。' : '未能完成请求，请换一种说法试试。'),
      )
      setStatus('ready')
    } catch {
      setStatus('error')
      setResponse('请求没有完成。请检查网络后重试。')
    }
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-label="打开 O-mos"
        className={`fixed bottom-5 right-5 z-[70] grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/25 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 motion-reduce:transition-none dark:bg-lime-400 dark:text-zinc-950 dark:hover:bg-lime-300 sm:bottom-6 sm:right-6 ${
          isOpen
            ? 'pointer-events-none scale-75 opacity-0'
            : 'scale-100 opacity-100'
        }`}
        data-page-agent-ignore
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <SparkleIcon className="h-5 w-5" />
      </button>

      <section
        aria-label="O-mos"
        aria-hidden={!isOpen}
        className={`fixed bottom-5 right-5 z-[70] w-[calc(100vw-2rem)] max-w-[23rem] origin-bottom-right overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/95 shadow-2xl shadow-zinc-900/15 backdrop-blur transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-black/30 sm:bottom-6 sm:right-6 sm:w-[23rem] ${
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0'
        }`}
        data-page-agent-ignore
        style={
          position
            ? { bottom: 'auto', left: position.left, right: 'auto', top: position.top }
            : undefined
        }
      >
        <div
          aria-label="拖动 Agent 窗口"
          className="flex touch-none cursor-grab items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-700/80 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-lime-300 text-zinc-950 dark:bg-lime-400">
              <SparkleIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-100">
                O-mos
              </p>
              <p className="text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                {status === 'loading' && '正在连接…'}
                {status === 'ready' && '已就绪'}
                {status === 'running' && '执行中…'}
                {status === 'error' && '需要重试'}
              </p>
            </div>
          </div>
          <button
            aria-label="收起 O-mos 窗口"
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-lime-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            onClick={() => setIsOpen(false)}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4 pt-3">
          <p aria-live="polite" className="min-h-12 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {response}
          </p>
          <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="page-agent-command">
              给 Agent 的指令
            </label>
            <input
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-300/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              disabled={status === 'loading' || status === 'running'}
              id="page-agent-command"
              onChange={(event) => setInput(event.target.value)}
              placeholder="例如：带我看看最近文章"
              value={input}
            />
            <button
              className="shrink-0 rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 dark:bg-lime-400 dark:text-zinc-950 dark:hover:bg-lime-300 dark:focus:ring-offset-zinc-900"
              disabled={!input.trim() || status === 'loading' || status === 'running'}
              type="submit"
            >
              发送
            </button>
          </form>
          <p className="mt-2 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">
            可拖动标题栏定位 · 由 O-mos 演示模型驱动
          </p>
        </div>
      </section>
    </>
  )
}
