'use server';
import { prisma } from '@repo/db';
import { revalidateTag } from 'next/cache';
import { auth } from '~/server/auth';
import type { ChallengeRouteData } from '../../getChallengeRouteData';
import { createCacheKeyForSolutions } from '../../solutions/_components/solutions.helpers';
import {
  createChallengeSubmissionCacheKey,
  createCompletedSubmissionCacheKey,
  createInProgressSubmissionCacheKey,
} from './cache-keys';

interface Args {
  challenge: ChallengeRouteData['challenge'];
  code: string;
  isSuccessful: boolean;
}
export async function saveSubmission({ challenge, code, isSuccessful }: Args) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Not Authorized');
  }
  const userId = session.user.id;

  const submission = await prisma.submission.create({
    data: {
      challengeId: challenge.id,
      userId,
      code,
      isSuccessful,
    },
  });
  revalidateTag(createChallengeSubmissionCacheKey(challenge.slug));
  revalidateTag(createCacheKeyForSolutions(challenge.slug));
  revalidateTag(createInProgressSubmissionCacheKey(userId));
  revalidateTag(createCompletedSubmissionCacheKey(userId));
  return submission;
}
