import { type Session } from '@repo/auth/server';
import { prisma } from '@repo/db';
import { cache } from 'react';
import { validateCompilerOptions } from '~/utils/validateCompilerOptions';

export type ChallengeRouteData = NonNullable<Awaited<ReturnType<typeof getChallengeRouteData>>>;

/**
 *this is data to populate the description tab (default tab on challenge page)
 */
export const getChallengeRouteData = cache(async (slug: string, session: Session | null) => {
  const challenge = await prisma.challenge.findFirstOrThrow({
    where: {
      slug,
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          roles: true,
          bio: true,
          image: true,
        },
      },
      _count: {
        select: {
          vote: true,
        },
      },
      vote: {
        where: {
          userId: session?.user?.id || '',
        },
      },
      bookmark: {
        where: {
          userId: session?.user?.id || '',
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
  });

  const tsconfig = challenge.tsconfig;
  if (!validateCompilerOptions(tsconfig)) {
    throw new Error(`Challenge "${challenge.slug}" has an invalid tsconfig`);
  }

  return {
    challenge: {
      ...challenge,
      hasSolved: challenge.submission.length > 0,
      tsconfig,
    },
  };
});
export const getCurrentChallenge = cache(async (slug: string, session: Session | null) => {
  return prisma.challenge.findFirstOrThrow({
    where: {
      slug,
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          vote: true,
        },
      },
      vote: {
        where: {
          userId: session?.user?.id || '',
        },
      },
      bookmark: {
        where: {
          userId: session?.user?.id || '',
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
  });
});

export type GetCurrentChallengeType = Awaited<ReturnType<typeof getCurrentChallenge>>;

export const isEnrolledInAnyTrack = cache(async (session: Session | null) => {
  if (!session) {
    return false;
  }
  const userWithTrackCount = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    select: {
      _count: {
        select: { tracks: true },
      },
    },
  });

  const numberOfTrack = userWithTrackCount?._count.tracks;
  if (!numberOfTrack) {
    return false;
  }
  return true;
});
