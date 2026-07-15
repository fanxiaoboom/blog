/**
 * Build an absolute URL from the domain currently open in the browser.
 *
 * Authentication redirects must follow the active site domain rather than a
 * build-time environment value, which may be different for previews or be
 * misconfigured.
 */
export function clientUrl(path = '') {
  const baseUrl =
    typeof window === 'undefined'
      ? (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
      : window.location.origin

  return new URL(path, baseUrl).href
}
