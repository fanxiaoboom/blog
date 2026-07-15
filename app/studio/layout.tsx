import { requireSiteOwner } from '~/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSiteOwner()

  return children
}
