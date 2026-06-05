import { type NextRequest, NextResponse } from 'next/server'

import { checkRateLimit, redis } from '~/lib/redis'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  if (!(await checkRateLimit('activity:app' + `_${req.ip ?? ''}`))) {
    return new Response('Too Many Requests', {
      status: 429,
    })
  }

  const app = await redis.get('activity:app')

  return NextResponse.json({
    app,
  })
}
