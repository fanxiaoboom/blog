import { Container } from '~/components/ui/Container'
import { requireSiteOwner } from '~/lib/permissions'

import { Sidebar } from './Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSiteOwner()

  return (
    <div>
      <Sidebar />

      <main className="py-10 lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">
          <Container className="py-12">{children}</Container>
        </div>
      </main>
    </div>
  )
}
