import { desc } from 'drizzle-orm'

import { db } from '~/db'
import { type GuestbookDto, GuestbookHashids } from '~/db/dto/guestbook.dto'
import { guestbook } from '~/db/schema'
import { isDatabaseEnabled } from '~/lib/services'

export async function fetchGuestbookMessages({
  limit = 200,
}: { limit?: number } = {}) {
  if (!isDatabaseEnabled) {
    return []
  }

  const data = await db
    .select({
      id: guestbook.id,
      userId: guestbook.userId,
      userInfo: guestbook.userInfo,
      message: guestbook.message,
      createdAt: guestbook.createdAt,
    })
    .from(guestbook)
    .orderBy(desc(guestbook.createdAt))
    .limit(limit)

  return data.map(
    ({ id, ...rest }) =>
      ({
        ...rest,
        id: GuestbookHashids.encode(id),
      }) as GuestbookDto
  )
}
