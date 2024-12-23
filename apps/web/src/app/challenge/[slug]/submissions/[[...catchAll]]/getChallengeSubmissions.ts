'use server';

import { prisma } from '@repo/db';
import { cache } from 'react';

export const getChallengeSubmissionById = cache(async (id: string) => {
  return prisma.submission.findFirst({
    where: {
      id: Number(id),
    },
    include: {
      challenge: {
        select: {
          name: true,
        },
      },
    },
  });
});
