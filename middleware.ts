import { authMiddleware } from '@clerk/nextjs'
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

async function beforeAuthMiddleware(req: NextRequest, evt: NextFetchEvent) {
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

  return NextResponse.next()
}

const hasClerkSecret = Boolean(
  process.env.CLERK_SECRET_KEY || process.env.CLERK_API_KEY
)

export default hasClerkSecret
  ? authMiddleware({
      beforeAuth: beforeAuthMiddleware,
      publicRoutes: [
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
      ],
    })
  : beforeAuthMiddleware
