import { authMiddleware } from '@clerk/nextjs'

type AuthMiddlewareParams = NonNullable<Parameters<typeof authMiddleware>[0]>
type BeforeAuthHandler = NonNullable<AuthMiddlewareParams['beforeAuth']>
import { get } from '@vercel/edge-config'
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server'

import { kvKeys } from '~/config/kv'
import { env } from '~/env.mjs'
import countries from '~/lib/countries.json'
import { getIP } from '~/lib/ip'
import { redis } from '~/lib/redis'

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}

const publicRoutes = [
  '/',
  '/api(.*)',
  '/blog(.*)',
  '/confirm(.*)',
  '/projects',
  '/guestbook',
  '/newsletters(.*)',
  '/about',
  '/rss',
  '/feed',
  '/ama',
]

function isPublicRoute(pathname: string) {
  return publicRoutes.some((pattern) => {
    // Clerk-style path-to-regexp: e.g. /blog(.*) matches /blog and /blog/foo
    const regex = new RegExp(
      `^${pattern
        .replace(/\\\./g, '\\.')
        .replace(/\(\.\*\)/g, '.*')}$`
    )
    return regex.test(pathname)
  })
}

const beforeAuthMiddleware = (async (req, evt) => {
  const { geo, nextUrl } = req
  const isApi = nextUrl.pathname.startsWith('/api/')

  if (process.env.EDGE_CONFIG) {
    const blockedIPs = await get<string[]>('blocked_ips')
    const ip = getIP(req)

    if (blockedIPs?.includes(ip)) {
      if (isApi) {
        return NextResponse.json(
          { error: 'You have been blocked.' },
          { status: 403 }
        )
      }

      nextUrl.pathname = '/blocked'
      return NextResponse.rewrite(nextUrl)
    }

    if (nextUrl.pathname === '/blocked') {
      nextUrl.pathname = '/'
      return NextResponse.redirect(nextUrl)
    }
  }

  if (geo && !isApi && env.VERCEL_ENV === 'production') {
    const country = geo.country
    const city = geo.city

    const countryInfo = countries.find((x) => x.cca2 === country)
    if (countryInfo) {
      const flag = countryInfo.flag
      // Visitor telemetry must never delay authentication or protected routes.
      evt.waitUntil(
        redis
          .set(kvKeys.currentVisitor, { country, city, flag })
          .catch(() => undefined)
      )
    }
  }

  // Skip Clerk authentication for public routes. Clerk's authMiddleware runs
  // authenticateRequest *before* checking publicRoutes, so a stale/invalid
  // __session cookie (or misconfigured Clerk instance) causes 401s even on
  // public pages. Returning false here tells authMiddleware to skip auth.
  if (isPublicRoute(nextUrl.pathname)) {
    return false
  }

  return NextResponse.next()
}) as BeforeAuthHandler

const hasClerkSecret = Boolean(
  process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY
)

export default hasClerkSecret
  ? authMiddleware({
      beforeAuth: beforeAuthMiddleware,
      publicRoutes,
    })
  : beforeAuthMiddleware
