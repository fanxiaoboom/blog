/**
 * Build an absolute URL from the domain currently open in the browser.
 *
 * Authentication redirects must follow the active site domain rather than a
 * build-time environment value, which may be different for previews or be
 * misconfigured.
 */
export function clientUrl(path = '') {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const baseUrl =
    typeof window === 'undefined'
      ? configuredSiteUrl?.match(/^https?:\/\//)
        ? configuredSiteUrl
        : 'http://localhost:3000'
      : window.location.origin

  return new URL(path, baseUrl).href
}
