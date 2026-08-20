import { Manrope } from 'next/font/google'

const sansFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
  // Site content is primarily Chinese (zh-CN); the visible CJK glyphs are not
  // covered by the Latin subset, so the preloaded woff2 is never used and
  // Chrome logs a "preloaded but not used" warning. Disable auto-preload —
  // the @font-face still loads Manrope for Latin text, numbers, and code.
  preload: false,
})

export { sansFont }
