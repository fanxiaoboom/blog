import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

import { isClerkEnabled } from '~/lib/services'

export function isSiteOwner(
  user: { publicMetadata: { siteOwner?: unknown } } | null
) {
  return Boolean(user?.publicMetadata.siteOwner)
}

/**
 * Server-side authorization for site administration and content editing.
 * UI visibility must never be used as the authorization boundary.
 */
export async function requireSiteOwner() {
  if (!isClerkEnabled) {
    redirect('/')
  }

  const user = await currentUser()
  if (!isSiteOwner(user)) {
    redirect('/')
  }

  return user
}
