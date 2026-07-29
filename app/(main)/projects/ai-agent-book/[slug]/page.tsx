/* eslint-disable @next/next/no-img-element -- Markdown figures have dynamic SVG dimensions. */
import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { BackToTopButton } from '~/app/(main)/projects/ai-agent-book/BackToTopButton'
import { BookNavigation } from '~/app/(main)/projects/ai-agent-book/BookNavigation'
import { LearningProgress } from '~/app/(main)/projects/ai-agent-book/LearningProgress'
import { Prose } from '~/components/Prose'
import { Container } from '~/components/ui/Container'
import { bookPages, getBookHref, getBookPageContent, getBookProgressSections, getBookSectionId, getBookSections } from '~/lib/ai-agent-book'

const chapters = bookPages
  .filter((page) => page.progressChapter)
  .map((page) => ({ slug: page.slug, title: page.title, href: getBookHref(page.slug) }))

function resolveHref(href?: string) {
  if (!href || href.startsWith('#') || /^(https?:|mailto:)/.test(href)) return href || '#'
  const [pathname, hash] = href.split('#')
  const page = bookPages.find((candidate) => candidate.file === pathname)
  if (page) return `${getBookHref(page.slug)}${hash ? `#${hash}` : ''}`
  return href
}

function resolveImage(src?: string) {
  if (!src || /^(https?:|data:)/.test(src)) return src || ''
  return src.startsWith('images/') ? `/ai-agent-book/images/${src.slice('images/'.length)}` : src
}

function getHeadingText(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(getHeadingText).join('')
  if (typeof children === 'object' && children && 'props' in children) {
    return getHeadingText((children as { props: { children?: React.ReactNode } }).props.children)
  }
  return ''
}

export function generateStaticParams() {
  return bookPages.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getBookPageContent(params.slug)
  return page
    ? { title: `${page.title} · 深入理解 AI Agent`, description: '在 BooMoo Space 阅读 AI Agent 技术书。' }
    : {}
}

export default async function AiAgentBookPage({ params }: { params: { slug: string } }) {
  const [page, progressSections] = await Promise.all([getBookPageContent(params.slug), getBookProgressSections()])
  if (!page) notFound()
  const content = page.content.replace(/^(#{1,6}\s+.*?)\s+\{\.[^}]+\}\s*$/gm, '$1')
  const sections = getBookSections(content)
  const sectionKeys = progressSections.map((section) => section.key)
  const sectionKeysByPage = progressSections.reduce<Record<string, string[]>>((keysByPage, section) => {
    ;(keysByPage[section.slug] ||= []).push(section.key)
    return keysByPage
  }, {})
  let sectionIndex = 0
  const getNextSectionId = (children: React.ReactNode) => {
    const section = sections[sectionIndex]
    sectionIndex += 1
    return section?.id || getBookSectionId(getHeadingText(children))
  }

  return (
    <Container className="mt-12 sm:mt-20">
      <div className="grid gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <BookNavigation pages={bookPages} activeSlug={page.slug} sections={sections} sectionKeysByPage={sectionKeysByPage} />
        </aside>
        <article data-book-reader-article className="min-w-0 max-w-3xl">
          <Link href="/projects/ai-agent-book" className="text-sm font-medium text-zinc-500 hover:text-lime-700 dark:text-zinc-400 dark:hover:text-lime-400">← 返回阅读项目</Link>
          <LearningProgress chapters={chapters} currentSlug={page.progressChapter ? page.slug : undefined} sections={sections} sectionKeys={sectionKeys} />
          <Prose className="max-w-none prose-zinc prose-headings:scroll-mt-24 prose-a:text-lime-700 hover:prose-a:text-lime-600 dark:prose-invert dark:prose-a:text-lime-400">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  const target = resolveHref(href)
                  const external = /^https?:/.test(target)
                  return external ? <a href={target} target="_blank" rel="noreferrer">{children}</a> : <Link href={target}>{children}</Link>
                },
                img: ({ src, alt }) => <img src={resolveImage(src)} alt={alt || ''} loading="lazy" />,
                h1: ({ children }) => <h1 className="mb-10 mt-0 scroll-mt-40 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">{children}</h1>,
                h2: ({ children }) => <h2 id={getNextSectionId(children)} className="mt-14 scroll-mt-40 border-b border-zinc-200 pb-3 text-2xl font-bold tracking-tight text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">{children}</h2>,
                h3: ({ children }) => <h3 id={getNextSectionId(children)} className="mt-10 scroll-mt-40 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{children}</h3>,
              }}
            >
              {content}
            </ReactMarkdown>
          </Prose>
        </article>
      </div>
      <BackToTopButton />
    </Container>
  )
}
