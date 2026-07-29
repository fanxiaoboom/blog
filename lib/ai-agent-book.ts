import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type BookPage = {
  slug: string
  file: string
  title: string
  progressChapter?: number
}

export type BookSection = {
  depth: 2 | 3
  id: string
  title: string
}

export const bookPages: BookPage[] = [
  { slug: 'introduction', file: 'introduction.md', title: '引言' },
  { slug: 'chapter-1', file: 'chapter1.md', title: '第 1 章 · Agent 基础知识', progressChapter: 1 },
  { slug: 'chapter-2', file: 'chapter2.md', title: '第 2 章 · 上下文工程', progressChapter: 2 },
  { slug: 'chapter-3', file: 'chapter3.md', title: '第 3 章 · 用户记忆和知识库', progressChapter: 3 },
  { slug: 'chapter-4', file: 'chapter4.md', title: '第 4 章 · 工具', progressChapter: 4 },
  { slug: 'chapter-5', file: 'chapter5.md', title: '第 5 章 · Coding Agent 与代码生成', progressChapter: 5 },
  { slug: 'chapter-6', file: 'chapter6.md', title: '第 6 章 · Agent 的评估', progressChapter: 6 },
  { slug: 'chapter-7', file: 'chapter7.md', title: '第 7 章 · 模型后训练', progressChapter: 7 },
  { slug: 'chapter-8', file: 'chapter8.md', title: '第 8 章 · Agent 的持续进化', progressChapter: 8 },
  { slug: 'chapter-9', file: 'chapter9.md', title: '第 9 章 · 多模态与实时交互', progressChapter: 9 },
  { slug: 'chapter-10', file: 'chapter10.md', title: '第 10 章 · 多 Agent 协作', progressChapter: 10 },
  { slug: 'afterword', file: 'afterword.md', title: '后记' },
  { slug: 'reference-answers', file: 'reference-answers.md', title: '思考题参考答案' },
]

const contentDirectory = path.join(process.cwd(), 'ai-agent-book', 'book')

export function getBookPage(slug: string) {
  return bookPages.find((page) => page.slug === slug)
}

export async function getBookPageContent(slug: string) {
  const page = getBookPage(slug)
  if (!page) return null

  const content = await readFile(path.join(contentDirectory, page.file), 'utf8')
  return { ...page, content }
}

export function getBookHref(slug: string) {
  return `/projects/ai-agent-book/${slug}`
}

export function getBookSectionId(title: string) {
  return `section-${title
    .toLocaleLowerCase()
    .replace(/[`*_[\]()]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')}`
}

function normalizeHeadingTitle(value: string) {
  return value
    .replace(/\s+\{\.[^}]+\}\s*$/, '')
    .replace(/!?(?:\[([^\]]+)\]\([^)]*\))/g, '$1')
    .replace(/[`*_]/g, '')
    .trim()
}

export function getBookSections(content: string): BookSection[] {
  const sections: BookSection[] = []
  const titleCounts = new Map<string, number>()

  for (const match of content.matchAll(/^(#{2,3})\s+(.+?)\s*#*\s*$/gm)) {
    const title = normalizeHeadingTitle(match[2])
    if (!title) continue
    const baseId = getBookSectionId(title)
    const count = titleCounts.get(baseId) || 0
    titleCounts.set(baseId, count + 1)
    sections.push({
      depth: match[1].length as 2 | 3,
      id: count ? `${baseId}-${count + 1}` : baseId,
      title,
    })
  }

  return sections
}
