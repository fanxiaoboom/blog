export const isClerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
)

export const isDatabaseEnabled = Boolean(process.env.DATABASE_URL)

export const isEmailEnabled = Boolean(process.env.RESEND_API_KEY)

export const isRedisEnabled = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)
