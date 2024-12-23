'use server';

import { prisma } from '@repo/db';
import { revalidateTag } from 'next/cache';
import { auth } from '~/server/auth';
import { createCacheKeyForBookmarksTab } from './bookmark.helpers';

export async function addOrRemoveBookmark(
  challengeId: number,
  userId: string,
  shouldBookmark: boolean,
) {
  const session = await auth();
  if (!session?.user?.id || userId !== session.user.id) return 'unauthorized';
  const bookmarkExists = await prisma.bookmark.findFirst({
    where: {
      challengeId,
      userId,
    },
  });
  if (!bookmarkExists && shouldBookmark) {
    await prisma.bookmark.create({
      data: {
        challengeId,
        userId,
      },
    });
  }
  if (bookmarkExists && !shouldBookmark) {
    await prisma.bookmark.delete({
      where: {
        id: bookmarkExists.id,
      },
    });
  }

  revalidateTag(createCacheKeyForBookmarksTab(userId));
}
