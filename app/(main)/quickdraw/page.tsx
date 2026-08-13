import { type Metadata } from 'next'

import { QuickdrawBoard } from '~/app/(main)/quickdraw/QuickdrawBoard'
import { Container } from '~/components/ui/Container'

const title = 'QuickDraw 画布'
const description =
  'Boomoospace 里的无限画布：随手画、写想法、贴素材，并自动保存到本机。'

export const metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { title, description, card: 'summary_large_image' },
} satisfies Metadata

export default function QuickdrawPage() {
  return (
    <Container className="mt-10 pb-12 sm:mt-16 sm:pb-20">
      <QuickdrawBoard />
    </Container>
  )
}
