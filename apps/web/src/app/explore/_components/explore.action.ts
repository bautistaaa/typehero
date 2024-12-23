'use server';

import { prisma } from '@repo/db';
import { Tags, type Difficulty } from '@repo/db/types';
import { cache } from 'react';
import { auth } from '~/server/auth';
import { AOT_CHALLENGES } from '../../challenge/[slug]/aot-slugs';

export type ExploreChallengeData = ReturnType<typeof getChallengesByTagOrDifficulty>;
const allTags: Tags[] = Object.values(Tags);

/**
 * Fetches challenges either by tag or difficulty.
 */
export async function getChallengesByTagOrDifficulty(str: string, take?: number) {
  const session = await auth();
  const formattedStr = str.trim().toUpperCase();

  return prisma.challenge.findMany({
    where: {
      status: 'ACTIVE',
      user: {
        NOT: {
          status: 'BANNED',
        },
      },
      // OR didn't work. so this workaround is fine because IT WORKS :3
      ...(allTags.includes(formattedStr as keyof typeof Tags)
        ? {
            tags: { every: { tag: formattedStr as Tags } },
          }
        : {
            difficulty: { in: [formattedStr as Difficulty] },
          }),
    },
    include: {
      _count: {
        select: { vote: true, comment: true },
      },
      user: {
        select: {
          name: true,
        },
      },
      submission: {
        where: {
          userId: session?.user?.id || '',
          isSuccessful: true,
        },
        take: 1,
      },
    },
    ...(take && {
      take,
    }),
  });
}
export type ChallengesByTagOrDifficulty = Awaited<
  ReturnType<typeof getChallengesByTagOrDifficulty>
>;

/**
 * Fetches the length of how many challenges are in a
 * difficutly / tag group
 * @param str difficutly or tag string
 */
export const getExploreChallengesLengthByTagOrDifficulty = cache(async (str: string) => {
  const formattedStr = str.trim().toUpperCase();

  return prisma.challenge.count({
    where: {
      status: 'ACTIVE',
      user: {
        NOT: {
          status: 'BANNED',
        },
      },
      difficulty: { in: [formattedStr as Difficulty] },
    },
  });
});

export const getAllChallenges = cache(async () => {
  const popularChallenges = await getChallengesByTagOrDifficulty('popular', 12);
  const beginnerChallenges = await getChallengesByTagOrDifficulty('beginner');
  const easyChallenges = await getChallengesByTagOrDifficulty('easy');
  const mediumChallenges = await getChallengesByTagOrDifficulty('medium');
  const hardChallenges = await getChallengesByTagOrDifficulty('hard');
  const extremeChallenges = await getChallengesByTagOrDifficulty('extreme');

  const allChallenges: AllChallenges = {
    popularChallenges,
    beginnerChallenges,
    easyChallenges,
    mediumChallenges,
    hardChallenges,
    extremeChallenges,
  };
  return allChallenges;
});

export interface AllChallenges {
  popularChallenges: ChallengesByTagOrDifficulty;
  beginnerChallenges: ChallengesByTagOrDifficulty;
  easyChallenges: ChallengesByTagOrDifficulty;
  mediumChallenges: ChallengesByTagOrDifficulty;
  hardChallenges: ChallengesByTagOrDifficulty;
  extremeChallenges: ChallengesByTagOrDifficulty;
}
