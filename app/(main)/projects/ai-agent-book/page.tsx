import { type Metadata } from 'next'
import Link from 'next/link'

import { BookNavigation } from '~/app/(main)/projects/ai-agent-book/BookNavigation'
import { LearningProgress } from '~/app/(main)/projects/ai-agent-book/LearningProgress'
import { Button } from '~/components/ui/Button'
import { Container } from '~/components/ui/Container'
import { bookPages, getBookHref, getBookProgressSections } from '~/lib/ai-agent-book'

const chapters = bookPages
  .filter((page) => page.progressChapter)
  .map((page) => ({ slug: page.slug, title: page.title, href: getBookHref(page.slug) }))

export const metadata: Metadata = {
  title: '深入理解 AI Agent',
  description: 'AI Agent 技术书阅读计划，支持浏览器本地学习进度。',
}

export default async function AiAgentBookIndexPage() {
  const progressSections = await getBookProgressSections()
  const sectionKeys = progressSections.map((section) => section.key)
  const sectionKeysByPage = progressSections.reduce<Record<string, string[]>>((keysByPage, section) => {
    ;(keysByPage[section.slug] ||= []).push(section.key)
    return keysByPage
  }, {})

  return (
    <Container className="mt-16 sm:mt-24">
      <div className="grid gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <BookNavigation pages={bookPages} sectionKeysByPage={sectionKeysByPage} />
        </aside>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-lime-700 dark:text-lime-400">BooMoo Space · 阅读项目</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">深入理解 AI Agent</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            一部关于 AI Agent 设计原理与工程实践的开源技术书。现在可以直接在 BooMoo Space 阅读，并记录自己的学习进度。
          </p>
          <LearningProgress chapters={chapters} sectionKeys={sectionKeys} />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={getBookHref('introduction')}>开始阅读</Button>
            <Link className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-lime-700 hover:underline dark:text-zinc-400 dark:hover:text-lime-400" href="https://github.com/bojieli/ai-agent-book" target="_blank" rel="noreferrer">
              查看上游开源仓库
            </Link>
          </div>
          <p className="mt-10 text-sm leading-6 text-zinc-500 dark:text-zinc-500">
            本项目基于上游 Apache-2.0 开源书籍制作；学习数据只保存在你的浏览器中。
          </p>
        </div>
      </div>
    </Container>
  )
}
