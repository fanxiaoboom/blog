import { ProjectCard } from '~/app/(main)/projects/ProjectCard'
import { getSettings } from '~/sanity/queries'

const stickerForgeProject = {
  _id: 'boomoospace-sticker-forge',
  name: '贴纸工坊',
  url: '/sticker-forge',
  description: '把文字或图片变成一张可以亲手揭起的立体贴纸。',
  icon: null,
  internal: true,
}

const aiAgentBookProject = {
  _id: 'boomoospace-ai-agent-book',
  name: '深入理解 AI Agent',
  url: '/projects/ai-agent-book',
  description:
    'AI Agent 技术书阅读计划，支持章节完成、阅读深度和本地学习进度。',
  icon: null,
  internal: true,
}

const quickdrawProject = {
  _id: 'boomoospace-quickdraw',
  name: 'QuickDraw 画布',
  url: '/quickdraw',
  description: '一张自动保存到本机的无限画布，随手画、写、贴、导出。',
  icon: null,
  internal: true,
}

export async function Projects() {
  const projects = [
    ...((await getSettings()).projects || []),
    aiAgentBookProject,
    quickdrawProject,
    stickerForgeProject,
  ]

  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
    >
      {projects.map((project) => (
        <ProjectCard project={project} key={project._id} />
      ))}
    </ul>
  )
}
