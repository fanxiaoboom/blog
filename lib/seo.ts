import { siteConfig } from '~/config/site.mjs'

export const seo = {
  title: siteConfig.title,
  description: siteConfig.description,
  url: new URL(siteConfig.url),
} as const
