import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import { env } from '~/env.mjs'
import { isRedisEnabled } from '~/lib/services'

type RedisLike = {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, options?: unknown): Promise<unknown>
  incr(key: string): Promise<number>
  mget<T>(...keys: string[]): Promise<T>
}

const upstashRedis = isRedisEnabled
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : undefined

const memoryStore = new Map<string, unknown>()

const previewRedis = {
  get<T>(key: string) {
    return Promise.resolve((memoryStore.get(key) ?? null) as T | null)
  },
  set(key: string, value: unknown) {
    memoryStore.set(key, value)
    return Promise.resolve('OK')
  },
  incr(key: string) {
    const current = Number(memoryStore.get(key) ?? 0) + 1
    memoryStore.set(key, current)
    return Promise.resolve(current)
  },
  mget<T>(...keys: string[]) {
    return Promise.resolve(keys.map((key) => memoryStore.get(key) ?? null) as T)
  },
} satisfies RedisLike

export const redis = (upstashRedis ?? previewRedis) as RedisLike

// Create a new ratelimiter, that allows 30 requests per 10 seconds
const ratelimit = upstashRedis
  ? new Ratelimit({
      redis: upstashRedis,
      limiter: Ratelimit.slidingWindow(30, '10 s'),
      analytics: true,
    })
  : undefined

export async function checkRateLimit(key: string) {
  if (!ratelimit) {
    return true
  }

  const { success } = await ratelimit.limit(key)
  return success
}
