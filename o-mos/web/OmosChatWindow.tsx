'use client'

import type { FormEvent, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import { AtomIcon, XIcon } from '~/assets'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type ConnectionStatus = 'checking' | 'ready' | 'running' | 'error'

const PANEL_GUTTER = 16
const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '我是 O-mos，运行在 Bran 的本地 Mac 上。想聊聊 LLM、RAG 或 AI 产品吗？',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function parseSseBlock(block: string) {
  const event = block
    .split('\n')
    .find((line) => line.startsWith('event:'))
    ?.slice('event:'.length)
    .trim()
  const data = block
    .split('\n')
    .find((line) => line.startsWith('data:'))
    ?.slice('data:'.length)
    .trim()

  if (!event || !data) return null
  try {
    return { event, data: JSON.parse(data) as { message?: string; session_id?: string; text?: string } }
  } catch {
    return null
  }
}

export function OmosChatWindow() {
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<ConnectionStatus>('checking')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage])

  useEffect(() => {
    async function checkConnection() {
      try {
        const response = await fetch('/api/o-mos/health', { cache: 'no-store' })
        setStatus(response.ok ? 'ready' : 'error')
      } catch {
        setStatus('error')
      }
    }

    void checkConnection()
  }, [])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia('(max-width: 639px)').matches) return
    const panel = event.currentTarget.parentElement
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
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
      left: clamp(event.clientX - dragOffsetRef.current.x, PANEL_GUTTER, window.innerWidth - rect.width - PANEL_GUTTER),
      top: clamp(event.clientY - dragOffsetRef.current.y, PANEL_GUTTER, window.innerHeight - rect.height - PANEL_GUTTER),
    })
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  async function handleReset() {
    if (status === 'running') return
    if (sessionId) {
      await fetch(`/api/o-mos/sessions/${encodeURIComponent(sessionId)}/reset`, {
        method: 'POST',
      })
    }
    setSessionId(null)
    setMessages([welcomeMessage])
    setStatus('ready')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = input.trim()
    if (!question || status === 'running') return

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question }
    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' }
    setMessages((current) => [...current, userMessage, assistantMessage])
    setInput('')
    setStatus('running')

    try {
      const response = await fetch('/api/o-mos/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, session_id: sessionId }),
      })
      const nextSessionId = response.headers.get('X-Omos-Session-Id')
      if (nextSessionId) setSessionId(nextSessionId)

      if (!response.ok || !response.body) {
        const error = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(error?.detail || 'O-mos 暂时无法回答。')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          const parsed = parseSseBlock(buffer.slice(0, boundary))
          buffer = buffer.slice(boundary + 2)
          boundary = buffer.indexOf('\n\n')
          if (!parsed) continue

          if (parsed.event === 'token' && parsed.data.text) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: message.content + parsed.data.text }
                  : message,
              ),
            )
          }
          if (parsed.event === 'done' && parsed.data.session_id) setSessionId(parsed.data.session_id)
          if (parsed.event === 'error') throw new Error(parsed.data.message || '模型调用失败。')
        }
      }

      setStatus('ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'O-mos 暂时无法回答。'
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id ? { ...item, content: message } : item,
        ),
      )
      setStatus('error')
    }
  }

  const statusText = {
    checking: '正在连接…',
    ready: '本地模型已就绪',
    running: '正在思考…',
    error: '连接需要检查',
  }[status]

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-label="打开 O-mos 本地模型"
        className={`fixed bottom-24 right-5 z-[60] grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/25 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 motion-reduce:transition-none dark:bg-lime-400 dark:text-zinc-950 dark:hover:bg-lime-300 sm:bottom-24 sm:right-6 ${
          isOpen ? 'pointer-events-none scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <AtomIcon className="h-5 w-5" />
      </button>

      <section
        aria-hidden={!isOpen}
        aria-label="O-mos 本地模型对话"
        className={`fixed bottom-24 right-5 z-[60] flex h-[min(32rem,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-[23rem] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/95 shadow-2xl shadow-zinc-900/15 backdrop-blur transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-black/30 sm:bottom-24 sm:right-6 sm:w-[23rem] ${
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0'
        }`}
        style={
          position
            ? { bottom: 'auto', left: position.left, right: 'auto', top: position.top }
            : undefined
        }
      >
        <div
          aria-label="拖动 O-mos 窗口"
          className="flex touch-none cursor-grab items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-700/80 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-lime-300 text-zinc-950 dark:bg-lime-400">
              <AtomIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-100">O-mos</p>
              <p className="text-xs leading-4 text-zinc-500 dark:text-zinc-400">{statusText}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="cursor-pointer rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-lime-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              disabled={status === 'running'}
              onClick={() => void handleReset()}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              新对话
            </button>
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
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((message) => (
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${
                message.role === 'user'
                  ? 'ml-auto bg-zinc-900 text-white dark:bg-lime-400 dark:text-zinc-950'
                  : 'border border-zinc-200/90 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300'
              }`}
              key={message.id}
            >
              {message.content || '…'}
            </div>
          ))}
        </div>

        <form className="border-t border-zinc-200/80 px-4 pb-4 pt-3 dark:border-zinc-700/80" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="o-mos-chat-input">给 O-mos 的问题</label>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-300/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              disabled={status === 'checking' || status === 'running'}
              id="o-mos-chat-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder="例如：什么是 RAG？"
              value={input}
            />
            <button
              className="shrink-0 rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 dark:bg-lime-400 dark:text-zinc-950 dark:hover:bg-lime-300 dark:focus:ring-offset-zinc-900"
              disabled={!input.trim() || status === 'checking' || status === 'running'}
              type="submit"
            >
              发送
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">Qwen3-4B · 由你的 Mac 本地运行</p>
        </form>
      </section>
    </>
  )
}
