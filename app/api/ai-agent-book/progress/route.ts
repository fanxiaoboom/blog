import { currentUser } from '@clerk/nextjs'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '~/db'
import { learningProgress } from '~/db/schema'
import { isDatabaseEnabled } from '~/lib/services'

const ProgressSchema = z.object({
  completed: z.record(z.boolean()),
  completedSections: z.record(z.boolean()),
  scrollDepth: z.record(z.number().min(0).max(100)),
  lastRead: z.string().optional(),
})

export async function GET() {
  if (!isDatabaseEnabled) {
    return NextResponse.json({ error: 'Learning progress is not configured.' }, { status: 503 })
  }

  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ authenticated: false, progress: null })
  }

  try {
    const [record] = await db
      .select({ progress: learningProgress.progress })
      .from(learningProgress)
      .where(eq(learningProgress.userId, user.id))
      .limit(1)

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      progress: record ? ProgressSchema.parse(record.progress) : null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unable to load learning progress.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!isDatabaseEnabled) {
    return NextResponse.json({ error: 'Learning progress is not configured.' }, { status: 503 })
  }

  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { progress } = z.object({ progress: ProgressSchema }).parse(await request.json())

    await db
      .insert(learningProgress)
      .values({ userId: user.id, progress })
      .onConflictDoUpdate({
        target: learningProgress.userId,
        set: { progress, updatedAt: new Date() },
      })

    return NextResponse.json({ progress })
  } catch (error) {
    return NextResponse.json({ error: 'Unable to save learning progress.' }, { status: 400 })
  }
}
