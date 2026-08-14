import { env } from '~/env.mjs'

export function url(path = '') {
  const configuredSiteUrl = env.NEXT_PUBLIC_SITE_URL
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? configuredSiteUrl?.match(/^https?:\/\//)
        ? configuredSiteUrl
        : 'https://boomoo.space'
      : 'http://localhost:3000'

  return new URL(path, baseUrl)
}
