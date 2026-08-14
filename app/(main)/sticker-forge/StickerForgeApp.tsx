'use client'

import React from 'react'

type StickerController = {
  setSource: (source: Record<string, unknown>) => Promise<void>
  setOptions: (options: Record<string, unknown>) => void
  reset: () => void
  setPeelProgress: (progress: number) => void
  resize: () => void
  destroy: () => void
}

declare global {
  interface Window {
    StickerForge?: {
      createSticker: (
        target: HTMLElement,
        options: Record<string, unknown>
      ) => Promise<StickerController>
    }
  }
}

const DEFAULTS = {
  text: 'BOOMOO',
  textColor: '#6d4aff',
  outlineColor: '#ffffff',
  outlineWidth: 16,
  backColor: '#f4f1ff',
  tilt: -3,
  soundEnabled: true,
}

type RichTextRun = {
  text: string
  color?: string
  fontSize?: number
  fontWeight?: number | string
  underline?: boolean
}

type RichTextBlock = {
  align?: 'left' | 'center' | 'right'
  lineHeight?: number
  runs: RichTextRun[]
}

type RichTextDocument = { blocks: RichTextBlock[] }

const DEFAULT_RICH_TEXT: RichTextDocument = {
  blocks: [
    {
      align: 'center',
      lineHeight: 1.1,
      runs: [
        {
          text: DEFAULTS.text,
          color: DEFAULTS.textColor,
          fontSize: 36,
          fontWeight: 900,
        },
      ],
    },
  ],
}

function editorAlignment(value: string): 'left' | 'center' | 'right' {
  if (value === 'left' || value === 'start') return 'left'
  if (value === 'right' || value === 'end') return 'right'
  return 'center'
}

function editorLineHeight(element: HTMLElement) {
  const stored = Number(element.dataset.lineHeight)
  if (Number.isFinite(stored) && stored > 0) return stored
  const style = getComputedStyle(element)
  const lineHeight = Number.parseFloat(style.lineHeight)
  const fontSize = Number.parseFloat(style.fontSize)
  if (
    Number.isFinite(lineHeight) &&
    Number.isFinite(fontSize) &&
    fontSize > 0
  ) {
    return Math.min(3, Math.max(0.7, lineHeight / fontSize))
  }
  return 1.2
}

function readRichTextEditor(
  root: HTMLDivElement,
  fallbackColor: string
): { document: RichTextDocument; text: string } {
  const blocks: RichTextBlock[] = []
  let current: RichTextBlock = {
    align: editorAlignment(getComputedStyle(root).textAlign),
    lineHeight: editorLineHeight(root),
    runs: [],
  }
  const appendRun = (run: RichTextRun) => {
    const previous = current.runs.at(-1)
    if (
      previous &&
      previous.color === run.color &&
      previous.fontSize === run.fontSize &&
      previous.fontWeight === run.fontWeight &&
      previous.underline === run.underline
    ) {
      previous.text += run.text
    } else {
      current.runs.push(run)
    }
  }
  const flush = (force = false) => {
    if (current.runs.length || force) {
      if (!current.runs.length) current.runs.push({ text: '' })
      blocks.push(current)
    }
    current = {
      align: editorAlignment(getComputedStyle(root).textAlign),
      lineHeight: editorLineHeight(root),
      runs: [],
    }
  }
  const appendText = (value: string, parent: Element) => {
    const style = getComputedStyle(parent)
    value
      .replace(/\r/g, '')
      .split('\n')
      .forEach((part, index, parts) => {
        if (part) {
          const weight = Number.parseInt(style.fontWeight, 10)
          appendRun({
            text: part,
            color: style.color || fallbackColor,
            fontSize: Number.parseFloat(style.fontSize) || 28,
            fontWeight: Number.isFinite(weight) && weight >= 600 ? 900 : 500,
            underline: style.textDecorationLine.includes('underline'),
          })
        }
        if (index < parts.length - 1) flush(true)
      })
  }
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.textContent ?? '', node.parentElement ?? root)
      return
    }
    if (!(node instanceof HTMLElement)) return
    if (node.tagName === 'BR') {
      flush(true)
      return
    }
    const isBlock = /^(DIV|P)$/.test(node.tagName)
    if (isBlock && current.runs.length) flush()
    if (isBlock) {
      current.align = editorAlignment(getComputedStyle(node).textAlign)
      current.lineHeight = editorLineHeight(node)
    }
    node.childNodes.forEach(visit)
    if (isBlock) flush(true)
  }
  root.childNodes.forEach(visit)
  if (current.runs.length || !blocks.length) flush(true)
  while (blocks.length > 1 && blocks.at(-1)?.runs.every((run) => !run.text)) {
    blocks.pop()
  }
  return {
    document: { blocks },
    text: blocks
      .map((block) => block.runs.map((run) => run.text).join(''))
      .join('\n'),
  }
}

function writeRichTextEditor(
  root: HTMLDivElement,
  document: RichTextDocument,
  fallbackColor: string
) {
  const blocks = document.blocks.length
    ? document.blocks
    : [{ align: 'center' as const, lineHeight: 1.2, runs: [{ text: '' }] }]
  root.replaceChildren(
    ...blocks.map((block) => {
      const element = window.document.createElement('div')
      const fontSize = Math.max(
        1,
        ...block.runs.map((run) => run.fontSize ?? 28)
      )
      element.dataset.lineHeight = String(block.lineHeight ?? 1.2)
      element.style.textAlign = block.align ?? 'center'
      element.style.lineHeight = `${fontSize * (block.lineHeight ?? 1.2)}px`
      block.runs.forEach((run) => {
        const span = window.document.createElement('span')
        span.textContent = run.text
        span.style.color = run.color ?? fallbackColor
        span.style.fontSize = `${run.fontSize ?? 28}px`
        span.style.fontWeight = String(run.fontWeight ?? 900)
        if (run.underline) span.style.textDecoration = 'underline'
        element.appendChild(span)
      })
      return element
    })
  )
}

function loadStickerForge() {
  if (window.StickerForge) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('sticker-forge-runtime')
    if (existing) {
      // Fast Refresh can leave a cancelled script element behind. Recreate it
      // instead of waiting forever for an event that has already been lost.
      existing.remove()
    }

    const script = document.createElement('script')
    script.id = 'sticker-forge-runtime'
    script.src = '/vendor/sticker-forge/sticker-forge.iife.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('贴纸引擎加载失败'))
    document.body.appendChild(script)
  })
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <span className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <input
          aria-label={label}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="font-mono text-xs uppercase text-zinc-500 dark:text-zinc-400">
          {value}
        </span>
      </span>
    </label>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  onChange,
  suffix = 'px',
  step = 1,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  suffix?: string
  step?: number
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        {label}
        <output className="font-mono font-normal text-zinc-500 dark:text-zinc-400">
          {value}
          {suffix}
        </output>
      </span>
      <input
        aria-label={label}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-lime-600 dark:bg-zinc-700 dark:accent-lime-400"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function InfoIcon() {
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 10.6v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 7.4h.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 8.2V4.5m0 0h3.7m-3.7 0 2.6 2.6A7.5 7.5 0 1 1 5 16.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 10h3.3l4.2-3.4v10.8L7.8 14H4.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {muted ? (
        <path
          d="m15.5 10.2 4 4m0-4-4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M15.2 9.4a3.6 3.6 0 0 1 0 5.2m2.4-7.8a7.2 7.2 0 0 1 0 10.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export function StickerForgeApp() {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const controllerRef = React.useRef<StickerController | null>(null)
  const richEditorRef = React.useRef<HTMLDivElement>(null)
  const selectionRef = React.useRef<Range | null>(null)
  const [engineVersion, setEngineVersion] = React.useState(0)
  const [mode, setMode] = React.useState<'text' | 'image'>('text')
  const [text, setText] = React.useState(DEFAULTS.text)
  const [richText, setRichText] = React.useState(DEFAULT_RICH_TEXT)
  const [imageSource, setImageSource] = React.useState<string | null>(null)
  const [imageName, setImageName] = React.useState('')
  const [textColor, setTextColor] = React.useState(DEFAULTS.textColor)
  const [editorFontSize, setEditorFontSizeValue] = React.useState(36)
  const [outlineColor, setOutlineColor] = React.useState(DEFAULTS.outlineColor)
  const [outlineWidth, setOutlineWidth] = React.useState(DEFAULTS.outlineWidth)
  const [backColor, setBackColor] = React.useState(DEFAULTS.backColor)
  const [tilt, setTilt] = React.useState(DEFAULTS.tilt)
  const [sizeMultiplier, setSizeMultiplier] = React.useState(1)
  const [soundEnabled, setSoundEnabled] = React.useState(DEFAULTS.soundEnabled)
  const [status, setStatus] = React.useState('正在准备互动贴纸…')

  React.useEffect(() => {
    const target = stageRef.current
    if (!target) return

    let disposed = false
    let settleTimer: number | null = null
    const clearSettleTimer = () => {
      if (settleTimer === null) return
      window.clearTimeout(settleTimer)
      settleTimer = null
    }
    const onPeelChange = (event: Event) => {
      const detail = (event as CustomEvent<{ progress?: number }>).detail
      setStatus(`已揭起 ${Math.round((detail?.progress ?? 0) * 100)}%`)
    }
    const onPeelEnd = () => {
      clearSettleTimer()
      setStatus('贴纸正在回正…')
      settleTimer = window.setTimeout(() => {
        controllerRef.current?.setPeelProgress(0)
        setStatus('从边缘向内拖动，试着再揭一次。')
      }, 160)
    }
    target.addEventListener('peelchange', onPeelChange)
    target.addEventListener('peelstart', clearSettleTimer)
    target.addEventListener('peelend', onPeelEnd)

    void loadStickerForge()
      .then(async () => {
        if (!window.StickerForge || disposed) return
        const controller = await window.StickerForge.createSticker(target, {
          source: {
            type: 'text',
            text: DEFAULTS.text,
            color: DEFAULTS.textColor,
            fontFamily: 'Arial Rounded MT Bold, Arial Black, sans-serif',
            fontWeight: 900,
          },
          outline: {
            width: DEFAULTS.outlineWidth,
            color: DEFAULTS.outlineColor,
          },
          shadow: {
            color: '#1c1728',
            opacity: 0.24,
            blur: 26,
            distance: 15,
            angle: 48,
          },
          peel: {
            radius: 0.14,
            stiffness: 0.72,
            maxAngle: 3.55,
            release: 'reset',
          },
          sound: { enabled: DEFAULTS.soundEnabled, volume: 0.6 },
          back: { color: DEFAULTS.backColor, gloss: 0.75, roughness: 0.22 },
          tilt: DEFAULTS.tilt,
          quality: 'high',
        })
        if (disposed) {
          controller.destroy()
          return
        }
        controllerRef.current = controller
        setStatus('已就绪：从贴纸真实边缘向内拖动。')
        setEngineVersion((version) => version + 1)
      })
      .catch((error: Error) => setStatus(error.message))

    return () => {
      disposed = true
      clearSettleTimer()
      target.removeEventListener('peelchange', onPeelChange)
      target.removeEventListener('peelstart', clearSettleTimer)
      target.removeEventListener('peelend', onPeelEnd)
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const controller = controllerRef.current
    if (!controller || !engineVersion) return

    if (mode === 'image' && imageSource) {
      void controller
        .setSource({ type: 'image', src: imageSource, name: imageName })
        .then(() => setStatus(`已载入 ${imageName}`))
        .catch(() => setStatus('图片无法处理，请换一张试试。'))
      return
    }

    void controller
      .setSource({
        type: 'text',
        text: text || ' ',
        color: textColor,
        fontFamily: 'Arial Rounded MT Bold, Arial Black, sans-serif',
        fontWeight: 900,
        richText,
      })
      .catch(() => setStatus('文字素材更新失败，请稍后重试。'))
  }, [engineVersion, imageName, imageSource, mode, richText, text, textColor])

  React.useEffect(() => {
    controllerRef.current?.setOptions({
      outline: {
        width: Math.round(outlineWidth * sizeMultiplier),
        color: outlineColor,
      },
      shadow: {
        blur: 26 * sizeMultiplier,
        distance: 15 * sizeMultiplier,
      },
      back: { color: backColor },
      tilt,
      sound: { enabled: soundEnabled, volume: 0.6 },
    })
    controllerRef.current?.resize()
  }, [
    backColor,
    engineVersion,
    outlineColor,
    outlineWidth,
    sizeMultiplier,
    soundEnabled,
    tilt,
  ])

  const rememberEditorSelection = () => {
    const editor = richEditorRef.current
    const selection = window.getSelection()
    if (
      !editor ||
      !selection?.rangeCount ||
      !editor.contains(selection.anchorNode)
    ) {
      return
    }
    selectionRef.current = selection.getRangeAt(0).cloneRange()
    const anchor =
      selection.anchorNode instanceof HTMLElement
        ? selection.anchorNode
        : selection.anchorNode?.parentElement
    if (anchor) {
      const style = getComputedStyle(anchor)
      const size = Number.parseFloat(style.fontSize)
      if (Number.isFinite(size)) setEditorFontSizeValue(Math.round(size))
    }
  }

  const syncRichEditor = () => {
    const editor = richEditorRef.current
    if (!editor) return
    const next = readRichTextEditor(editor, textColor)
    setText(next.text)
    setRichText(next.document)
    setMode('text')
    rememberEditorSelection()
  }

  const restoreEditorSelection = () => {
    const selection = window.getSelection()
    const range = selectionRef.current
    if (!selection || !range) return
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const runEditorCommand = (command: string, value?: string) => {
    const editor = richEditorRef.current
    if (!editor) return
    editor.focus({ preventScroll: true })
    restoreEditorSelection()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, value)
    syncRichEditor()
  }

  const setEditorColor = (value: string) => {
    setTextColor(value)
    runEditorCommand('foreColor', value)
  }

  const setEditorFontSize = (value: number) => {
    const editor = richEditorRef.current
    if (!editor) return
    const fontSize = Math.min(72, Math.max(12, value))
    editor.focus({ preventScroll: true })
    restoreEditorSelection()
    const range = selectionRef.current
    if (range && !range.collapsed) {
      const fragment = range.extractContents()
      const span = document.createElement('span')
      span.style.fontSize = `${fontSize}px`
      span.appendChild(fragment)
      range.insertNode(span)
      const selection = window.getSelection()
      const nextRange = document.createRange()
      nextRange.selectNodeContents(span)
      selection?.removeAllRanges()
      selection?.addRange(nextRange)
      selectionRef.current = nextRange.cloneRange()
    } else {
      document.execCommand('fontSize', false, '5')
    }
    setEditorFontSizeValue(fontSize)
    syncRichEditor()
  }

  const handleRichPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    document.execCommand(
      'insertText',
      false,
      event.clipboardData.getData('text/plain')
    )
    syncRichEditor()
  }

  const chooseImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      setStatus('请选择小于 15 MB 的图片。')
      return
    }
    setStatus('正在本地读取图片…')
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('图片读取失败'))
      reader.readAsDataURL(file)
    })
    setImageName(file.name)
    setImageSource(source)
    setMode('image')
  }

  const reset = () => {
    setText(DEFAULTS.text)
    setRichText(DEFAULT_RICH_TEXT)
    setMode('text')
    setTextColor(DEFAULTS.textColor)
    setEditorFontSizeValue(36)
    setOutlineColor(DEFAULTS.outlineColor)
    setOutlineWidth(DEFAULTS.outlineWidth)
    setBackColor(DEFAULTS.backColor)
    setTilt(DEFAULTS.tilt)
    setSizeMultiplier(1)
    setSoundEnabled(DEFAULTS.soundEnabled)
    if (richEditorRef.current) {
      writeRichTextEditor(
        richEditorRef.current,
        DEFAULT_RICH_TEXT,
        DEFAULTS.textColor
      )
    }
    controllerRef.current?.reset()
    setStatus('已恢复默认贴纸。')
  }

  const exportPng = () => {
    const canvas = stageRef.current?.querySelector('canvas')
    if (!canvas) {
      setStatus('贴纸还在准备中，请稍后再试。')
      return
    }
    const link = document.createElement('a')
    link.download = 'boomoospace-sticker.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    setStatus('PNG 已开始下载。')
  }

  return (
    <section aria-labelledby="sticker-forge-title">
      <header className="max-w-2xl">
        <h1
          id="sticker-forge-title"
          className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl"
        >
          贴纸工坊
        </h1>
        <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          写下文字，或放入一张图，然后从边缘揭起它。
        </p>
      </header>

      <div className="mt-10 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_24px_70px_rgb(24_24_27_/_0.10)] dark:border-zinc-700 dark:bg-zinc-900 sm:mt-14">
        <div className="grid min-h-[700px] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative min-h-[520px] overflow-hidden bg-[#eeeaf8] sm:min-h-[620px]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.94),transparent_43%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#9b93aa_0.75px,transparent_0.75px)] [background-size:20px_20px]" />
            <div
              ref={stageRef}
              className="absolute inset-0 z-10"
              aria-label="互动贴纸预览"
            />
            <p className="pointer-events-none absolute bottom-6 left-14 right-6 z-20 text-right text-xs font-medium text-zinc-500 sm:bottom-8 sm:left-auto sm:right-8">
              {status}
            </p>
          </div>

          <aside className="border-t border-zinc-200 bg-white/90 p-6 dark:border-zinc-700 dark:bg-zinc-900 sm:p-7 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                制作面板
              </h2>
              <span className="text-xs text-zinc-400">本地处理</span>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              {(['text', 'image'] as const).map((item) => (
                <button
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    mode === item
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                >
                  {item === 'text' ? '文字' : '图片'}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-5">
              {mode === 'text' ? (
                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    贴纸文字
                  </span>
                  <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition focus-within:border-lime-500 focus-within:ring-2 focus-within:ring-lime-500/20 dark:border-zinc-700 dark:bg-zinc-800">
                    <div
                      className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-800/70"
                      role="toolbar"
                      aria-label="富文本编辑工具"
                    >
                      <button
                        className="rounded px-2 py-1 text-xs font-bold text-zinc-700 transition hover:bg-white hover:shadow-sm dark:text-zinc-200 dark:hover:bg-zinc-700"
                        type="button"
                        aria-label="加粗"
                        title="加粗"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runEditorCommand('bold')}
                      >
                        B
                      </button>
                      <button
                        className="rounded px-2 py-1 text-xs font-semibold text-zinc-700 underline transition hover:bg-white hover:shadow-sm dark:text-zinc-200 dark:hover:bg-zinc-700"
                        type="button"
                        aria-label="下划线"
                        title="下划线"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runEditorCommand('underline')}
                      >
                        U
                      </button>
                      <select
                        className="h-7 rounded border-0 bg-transparent px-1 text-xs font-medium text-zinc-600 outline-none dark:text-zinc-300"
                        aria-label="选中文字字号"
                        value={editorFontSize}
                        onMouseDown={rememberEditorSelection}
                        onChange={(event) =>
                          setEditorFontSize(Number(event.target.value))
                        }
                      >
                        {[18, 24, 32, 36, 44, 56, 72].map((size) => (
                          <option key={size} value={size}>
                            {size}px
                          </option>
                        ))}
                      </select>
                      <span className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-600" />
                      {(
                        [
                          ['left', 'justifyLeft', '左对齐'],
                          ['center', 'justifyCenter', '居中'],
                          ['right', 'justifyRight', '右对齐'],
                        ] as const
                      ).map(([align, command, label]) => (
                        <button
                          className="rounded px-1.5 py-1 text-xs text-zinc-600 transition hover:bg-white hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-700"
                          key={align}
                          type="button"
                          aria-label={label}
                          title={label}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => runEditorCommand(command)}
                        >
                          {align === 'left'
                            ? '≡'
                            : align === 'center'
                              ? '☰'
                              : '≡'}
                        </button>
                      ))}
                      <label
                        className="ml-auto flex h-7 cursor-pointer items-center gap-1 rounded px-1 text-xs font-medium text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-700"
                        title="选中文字颜色"
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-sm border border-zinc-300"
                          style={{ backgroundColor: textColor }}
                        />
                        <input
                          className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                          type="color"
                          aria-label="选中文字颜色"
                          value={textColor}
                          onMouseDown={rememberEditorSelection}
                          onChange={(event) =>
                            setEditorColor(event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <div
                      ref={richEditorRef}
                      className="min-h-24 p-3 text-center text-lg font-black leading-tight text-zinc-900 outline-none empty:before:pointer-events-none empty:before:text-sm empty:before:font-medium empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)] dark:text-white"
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="富文本贴纸内容"
                      aria-multiline="true"
                      data-placeholder="输入文字"
                      spellCheck={false}
                      onInput={syncRichEditor}
                      onPaste={handleRichPaste}
                      onSelect={rememberEditorSelection}
                      onKeyUp={rememberEditorSelection}
                      onMouseUp={rememberEditorSelection}
                      onFocus={rememberEditorSelection}
                    >
                      <div
                        data-line-height="1.1"
                        style={{ lineHeight: '39.6px' }}
                      >
                        <span
                          style={{
                            color: DEFAULTS.textColor,
                            fontSize: 36,
                            fontWeight: 900,
                          }}
                        >
                          {DEFAULTS.text}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    选中文字后可修改样式；换行会成为独立的排版行。
                  </p>
                </div>
              ) : (
                <label className="grid cursor-pointer gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center transition hover:border-lime-500 hover:bg-lime-50/50 dark:border-zinc-600 dark:bg-zinc-800/60 dark:hover:bg-lime-950/20">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {imageName || '选择一张图片'}
                  </span>
                  <span className="text-xs leading-5 text-zinc-500">
                    PNG、JPG、WebP 或 SVG，小于 15 MB
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*,.svg"
                    onChange={chooseImage}
                  />
                </label>
              )}

              {mode === 'image' && (
                <ColorField
                  label="默认文字颜色"
                  value={textColor}
                  onChange={setTextColor}
                />
              )}
              <RangeField
                label="贴纸尺寸"
                value={sizeMultiplier}
                min={0.65}
                max={1.35}
                step={0.05}
                suffix="×"
                onChange={setSizeMultiplier}
              />
              <RangeField
                label="白边宽度"
                value={outlineWidth}
                min={0}
                max={30}
                onChange={setOutlineWidth}
              />
              <ColorField
                label="背纸颜色"
                value={backColor}
                onChange={setBackColor}
              />
              <RangeField
                label="整体倾斜"
                value={tilt}
                min={-12}
                max={12}
                suffix="°"
                onChange={setTilt}
              />
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-700 dark:bg-zinc-900 sm:px-8">
          <details className="group relative -ml-2">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 dark:text-zinc-400 dark:hover:text-white [&::-webkit-details-marker]:hidden"
              aria-label="查看贴纸引擎署名与许可"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white p-[7px] shadow-sm transition group-hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:group-hover:border-zinc-600">
                <InfoIcon />
              </span>
            </summary>
            <div className="absolute bottom-11 left-0 z-30 w-64 rounded-xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-600 shadow-xl shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              基于{' '}
              <a
                className="font-semibold text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:text-lime-700 dark:text-zinc-100 dark:hover:text-lime-400"
                href="https://github.com/CatsJuice/sticker-forge"
                target="_blank"
                rel="noreferrer"
              >
                CatsJuice/sticker-forge
              </a>{' '}
              · MIT
            </div>
          </details>
          <div className="flex items-center gap-2">
            <button
              className="group flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 dark:text-zinc-400 dark:hover:text-white"
              type="button"
              aria-label="恢复默认贴纸"
              title="恢复默认贴纸"
              onClick={reset}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white p-[7px] shadow-sm transition group-hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:group-hover:border-zinc-600">
                <ResetIcon />
              </span>
            </button>
            <button
              className={`group flex h-11 w-11 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 ${
                soundEnabled
                  ? 'text-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
              type="button"
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? '关闭撕贴声音' : '开启撕贴声音'}
              title={soundEnabled ? '关闭撕贴声音' : '开启撕贴声音'}
              onClick={() => setSoundEnabled((enabled) => !enabled)}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border p-[7px] shadow-sm transition ${
                  soundEnabled
                    ? 'border-lime-300 bg-lime-100 dark:border-lime-700 dark:bg-lime-950/50'
                    : 'border-zinc-200 bg-white group-hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:group-hover:border-zinc-600'
                }`}
              >
                <SoundIcon muted={!soundEnabled} />
              </span>
            </button>
            <button
              className="rounded-lg bg-lime-500 px-3 py-2 text-sm font-bold text-lime-950 transition hover:bg-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
              type="button"
              onClick={exportPng}
            >
              导出 PNG
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}
