'use server';

import { prisma } from '@repo/db';
import { headers } from 'next/headers';
import { auth } from '~/server/auth';
import { rateLimit } from '~/utils/rateLimit';

export async function markNotificationsAsRead(ids: number[]) {
  const session = await auth();

  if (!session) {
    throw new Error('User not authenticated');
  }

  await prisma.notification.updateMany({
    where: {
      toUserId: session.user.id,
      id: {
        in: ids,
      },
    },
    data: {
      isRead: true,
    },
  });
}

export type Notification = Awaited<ReturnType<typeof getNotifications>>['notifications'][0];
export type GetNotificationsResponse = Awaited<ReturnType<typeof getNotifications>>;

/**
 * Fetches user enrolled tracks based on current session.
 */
export async function getNotifications({
  cursor,
  mentionsOnly = false,
}: {
  cursor?: number;
  mentionsOnly?: boolean;
}) {
  const session = await auth();
  if (!session) {
    throw new Error('not authenticated');
  }

  const notifications = await prisma.notification.findMany({
    take: 50,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    where: {
      toUserId: session.user.id,
      type: mentionsOnly ? 'MENTION' : undefined,
    },
    select: {
      id: true,
      blurb: true,
      createdAt: true,
      url: true,
      comment: {
        select: {
          id: true,
          rootType: true,
          text: true,
        },
      },
      isRead: true,
      content: true,
      fromUser: {
        select: {
          image: true,
          name: true,
        },
      },
      type: true,
    },
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  if (notifications.length === 0) {
    return {
      notifications: [],
      cursor: undefined,
    };
  }

  const nextPage = await prisma.notification.findMany({
    take: 1,
    skip: 1,
    cursor: { id: notifications.at(-1)?.id },
    where: {
      toUserId: session.user.id,
      type: mentionsOnly ? 'MENTION' : undefined,
    },
    select: {
      id: true,
    },
    orderBy: [
      {
        createdAt: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  return {
    notifications,
    cursor: nextPage.length > 0 ? notifications.at(-1)?.id : undefined,
  };
}

export async function markAllAsRead() {
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown';
  const isRateLimited = rateLimit(ip);
  if (isRateLimited) {
    throw new Error('Rate limit exceeded');
  }

  const session = await auth();
  if (!session) {
    throw new Error('not authenticated');
  }

  await prisma.notification.updateMany({
    where: {
      toUserId: session.user.id ?? '',
    },
    data: {
      isRead: true,
    },
  });
}
