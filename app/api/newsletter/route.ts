import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailConfig } from '~/config/email'
import { siteConfig } from '~/config/site.mjs'
import { db } from '~/db'
import { subscribers } from '~/db/schema'
import ConfirmSubscriptionEmail from '~/emails/ConfirmSubscription'
import { env } from '~/env.mjs'
import { url } from '~/lib'
import { resend } from '~/lib/mail'
import { checkRateLimit } from '~/lib/redis'
import { isDatabaseEnabled } from '~/lib/services'

const newsletterFormSchema = z.object({
  email: z.string().email().min(1),
})

export async function POST(req: NextRequest) {
  if (env.NODE_ENV === 'production') {
    if (!(await checkRateLimit('subscribe_' + (req.ip ?? '')))) {
      return NextResponse.error()
    }
  }

  try {
    const { data } = await req.json()
    const parsed = newsletterFormSchema.parse(data)

    if (!isDatabaseEnabled) {
      return NextResponse.json({ status: 'success' })
    }

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, parsed.email))

    if (subscriber) {
      return NextResponse.json({ status: 'success' })
    }

    // generate a random one-time token
    const token = crypto.randomUUID()

    if (env.NODE_ENV === 'production' && resend) {
      await resend.emails.send({
        from: emailConfig.from,
        to: parsed.email,
        subject: `来自 ${siteConfig.name} 的订阅确认`,
        react: ConfirmSubscriptionEmail({
          link: url(`confirm/${token}`).href,
        }),
      })

      await db.insert(subscribers).values({
        email: parsed.email,
        token,
      })
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('[Newsletter]', error)

    return NextResponse.error()
  }
}
