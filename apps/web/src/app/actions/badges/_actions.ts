'use server';

import { prisma } from '@repo/db';
import {
  awardDifficultyBadge,
  difficultyBadgeKeys,
  type DifficultyBadges,
  difficultyBadgesFn,
} from '~/app/actions/badges/badge-types/difficulty-badges';
import {
  awardSolutionBadge,
  sharedSolutionsBadgesFn,
  solutionBadgeKeys,
  type SolutionBadges,
} from '~/app/actions/badges/badge-types/shared-solutions-badges';
import {
  adventBadgesFn,
  aotBadgeKeys,
  type AotBadges,
  awardAdventBadges,
} from '~/app/actions/badges/badge-types/advent-badges';

export type HistoricalChallenge = Awaited<ReturnType<typeof getChallengeHistoryByCategory>>[0];

type HistoryType = 'completed' | 'in-progress';
const getPredicateByType = (type: HistoryType, userId: string) => {
  switch (type) {
    case 'in-progress':
      return {
        AND: [
          {
            submission: {
              none: {
                userId,
                isSuccessful: true,
              },
            },
          },
          // Make sure there is at least one submission
          { submission: { some: { userId, isSuccessful: false } } },
        ],
      };
    case 'completed':
      return {
        submission: {
          some: {
            userId,
            isSuccessful: true,
          },
        },
      };
  }
};

export async function getChallengeHistoryByCategory(type: HistoryType, userId: string) {
  const challenges = await prisma.challenge.findMany({
    where: getPredicateByType(type, userId),
    select: {
      id: true,
      slug: true,
      name: true,
      submission: {
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  });

  return challenges
    .map((challenge) => ({
      ...challenge,
      submissionDate: challenge.submission[0]?.createdAt,
    }))
    .sort(
      (challengeA, challengeB) =>
        new Date(challengeB.submissionDate!).getTime() -
        new Date(challengeA.submissionDate!).getTime(),
    );
}

export interface Badges<T> {
  slug: T;
  name: string;
  shortName: string;
}

type BadgeTypes = AotBadges | DifficultyBadges | SolutionBadges;
export type BadgeObj = {
  [key in BadgeTypes]?: {
    slug: key;
    name: string;
    shortName: string;
  };
};

export type AllBadges = Badges<BadgeTypes>;
export type AllBadgeObjs = BadgeObj;

export type BadgesFn = ({
  userId,
  badges,
}: {
  userId: string;
  badges: AllBadgeObjs;
}) => Promise<AllBadgeObjs>;

const badgeCalculations: BadgesFn[] = [adventBadgesFn, difficultyBadgesFn, sharedSolutionsBadgesFn];

export async function fillInMissingBadges(userId: string): Promise<AllBadgeObjs> {
  let badges: AllBadgeObjs = {};

  for (const badgeFn of badgeCalculations) {
    badges = await badgeFn({ userId, badges });
  }

  const userBadges = await prisma.userBadge.findMany({
    where: {
      userId,
    },
    select: {
      badgeName: true,
    },
  });

  const missingBadges = Object.values(badges).filter(
    (x) => !userBadges.map((x) => x.badgeName).includes(x.slug),
  );
  console.log(missingBadges);
  for (const badge of missingBadges) {
    await prisma.userBadge.create({
      data: {
        badgeName: badge.slug,
        achievementDate: new Date(Date.now()).toISOString(),
        userId,
      },
    });
  }
  return badges;
}

const isBadgeWith = (badge: string) => (keys: readonly string[]) => keys.includes(badge);

export interface BadgeInfo {
  slug: AotBadges;
  name: string;
}

export async function getBadges(userId: string): Promise<BadgeInfo[]> {
  //TODO: should this be removed, or changed? On every call to profile is excessive
  await fillInMissingBadges(userId);
  let badges: AllBadgeObjs = {};

  // retrieve current awarded badge-types
  const userBadges = await prisma.userBadge.findMany({
    where: {
      userId,
    },
    select: {
      badgeName: true,
    },
  });

  userBadges.forEach(({ badgeName }) => {
    const checkBadgeType = isBadgeWith(badgeName);
    if (checkBadgeType(difficultyBadgeKeys)) {
      badges = Object.assign(badges, awardDifficultyBadge(badgeName as DifficultyBadges));
    } else if (checkBadgeType(solutionBadgeKeys)) {
      badges = Object.assign(badges, awardSolutionBadge(badgeName as SolutionBadges));
    } else if (checkBadgeType(aotBadgeKeys)) {
      badges = Object.assign(badges, awardAdventBadges(badgeName as AotBadges));
    }
  });
  const badgeModels = Object.values(badges)
    // .filter((x) => aotBadgeKeys.includes(x.slug as AotBadges))
    .map((x) => ({ slug: x.slug as AotBadges, name: x.name }));
  console.log('badges', badgeModels);
  return badgeModels;
}
