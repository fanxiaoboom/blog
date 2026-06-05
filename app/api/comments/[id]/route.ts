import { clerkClient, currentUser } from '@clerk/nextjs'
import { asc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailConfig } from '~/config/email'
import { db } from '~/db'
import {
  type CommentDto,
  CommentHashids,
  type PostIDLessCommentDto,
} from '~/db/dto/comment.dto'
import { comments } from '~/db/schema'
import NewReplyCommentEmail from '~/emails/NewReplyComment'
import { env } from '~/env.mjs'
import { url } from '~/lib'
import { resend } from '~/lib/mail'
import { checkRateLimit } from '~/lib/redis'
import { isDatabaseEnabled } from '~/lib/services'
import { client } from '~/sanity/lib/client'

function getKey(id: string) {
  return `comments:${id}`
}

type Params = { params: { id: string } }
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const postId = params.id

    if (!(await checkRateLimit(getKey(postId) + `_${req.ip ?? ''}`))) {
      return new Response('Too Many Requests', {
        status: 429,
      })
    }

    if (!isDatabaseEnabled) {
      return NextResponse.json([])
    }

    const data = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        userInfo: comments.userInfo,
        body: comments.body,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
      })
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt))

    return NextResponse.json(
      data.map(
        ({ id, parentId, ...rest }) =>
          ({
            ...rest,
            id: CommentHashids.encode(id),
            parentId: parentId ? CommentHashids.encode(parentId) : null,
          }) as PostIDLessCommentDto
      )
    )
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 })
  }
}

const CreateCommentSchema = z.object({
  body: z.object({
    blockId: z.string().optional(),
    text: z.string().min(1).max(999),
  }),
  parentId: z.string().nullable().optional(),
})

export async function POST(req: NextRequest, { params }: Params) {
  if (!isDatabaseEnabled) {
    return NextResponse.json(
      { error: 'Comments are not configured for local preview.' },
      { status: 503 }
    )
  }

  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const postId = params.id

  if (!(await checkRateLimit(getKey(postId) + `_${req.ip ?? ''}`))) {
    return new Response('Too Many Requests', {
      status: 429,
    })
  }

  const post = await client.fetch<
    { slug: string; title: string; imageUrl: string } | undefined
  >(
    '*[_type == "post" && _id == $id][0]{ "slug": slug.current, title, "imageUrl": mainImage.asset->url }',
    {
      id: postId,
    }
  )
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 412 })
  }

  try {
    const data = await req.json()
    const { body, parentId: hashedParentId } = CreateCommentSchema.parse(data)

    const [parentId] = CommentHashids.decode(hashedParentId ?? '')
    const commentData = {
      postId,
      userId: user.id,
      body,
      userInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      },
      parentId: parentId ? (parentId as number) : null,
    }

    if (parentId && env.NODE_ENV === 'production') {
      const [parentUserFromDb] = await db
        .select({
          userId: comments.userId,
        })
        .from(comments)
        .where(eq(comments.id, parentId as number))
      if (parentUserFromDb && parentUserFromDb.userId !== user.id) {
        const { primaryEmailAddressId, emailAddresses } =
          await clerkClient.users.getUser(parentUserFromDb.userId)
        const primaryEmailAddress = emailAddresses.find(
          (emailAddress) => emailAddress.id === primaryEmailAddressId
        )
        if (primaryEmailAddress && resend) {
          await resend.emails.send({
            from: emailConfig.from,
            to: primaryEmailAddress.emailAddress,
            subject: '👋 有人回复了你的评论',
            react: NewReplyCommentEmail({
              postTitle: post.title,
              postLink: url(`/blog/${post.slug}`).href,
              postImageUrl: post.imageUrl,
              userFirstName: user.firstName,
              userLastName: user.lastName,
              userImageUrl: user.imageUrl,
              commentContent: body.text,
            }),
          })
        }
      }
    }

    const [newComment] = await db
      .insert(comments)
      .values(commentData)
      .returning({
        newId: comments.id,
      })

    return NextResponse.json({
      ...commentData,
      id: CommentHashids.encode(newComment.newId),
      createdAt: new Date(),
      parentId: hashedParentId,
    } satisfies CommentDto)
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 })
  }
}
