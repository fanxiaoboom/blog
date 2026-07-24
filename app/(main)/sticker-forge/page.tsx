import { type Metadata } from 'next'

import { StickerForgeApp } from '~/app/(main)/sticker-forge/StickerForgeApp'
import { Container } from '~/components/ui/Container'

const title = '贴纸工坊'
const description = '把文字或图片变成一张可以亲手揭起的立体贴纸。'

export const metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { title, description, card: 'summary_large_image' },
} satisfies Metadata

export default function StickerForgePage() {
  return (
    <Container className="mt-12 pb-20 sm:mt-20 sm:pb-28">
      <StickerForgeApp />
    </Container>
  )
}
