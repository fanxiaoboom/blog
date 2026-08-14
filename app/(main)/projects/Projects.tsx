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

export async function Projects() {
  const projects = [
    ...((await getSettings()).projects || []),
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
