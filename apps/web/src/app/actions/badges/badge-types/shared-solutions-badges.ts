import { prisma } from '@repo/db';
import type { AllBadgeObjs, BadgesFn } from '../_actions';
import type { DifficultyBadges } from '~/app/actions/badges/badge-types/difficulty-badges';
import type { AotBadges } from '~/app/actions/badges/badge-types/advent-badges';

export const solutionBadgeKeys = [
  'most-shared-solutions-bronze',
  'most-shared-solutions-silver',
  'most-shared-solutions-gold',
  'most-shared-solutions-platinum',
] as const;

export type SolutionBadges = (typeof solutionBadgeKeys)[number];

export interface SharedTotals {
  TotalCompleted: number;
}

export const sharedSolutionsBadgesFn: BadgesFn = async ({
  userId,
  badges,
}: {
  userId: string;
  badges: AllBadgeObjs;
}) => {
  // Shared Solutions Badges
  const sharedSolutions: SharedTotals[] | null = await sharedSolutionRetrieveData(userId);
  return await computeSharedBadges(badges, sharedSolutions ?? []);
};

export const sharedSolutionRetrieveData = async (userId: string) => {
  return await prisma.$queryRaw<
    SharedTotals[]
  >`SELECT COUNT(SharedSolutionId) as TotalCompleted FROM (SELECT DISTINCT SharedSolutionId FROM SharedSolution JOIN Challenge ON SharedSolution.challengeId = Challenge.Id JOIN Vote ON SharedSolution.Id = Vote.SharedSolutionId WHERE SharedSolution.userId = ${userId} AND rootType = 'SHAREDSOLUTION') unique_query`;
};

export const awardSolutionBadge = (slug: AotBadges | DifficultyBadges | SolutionBadges) => {
  const badgeLevel = `${slug.split('-')[3]}`;
  const badgeName = `${badgeLevel[0]?.toUpperCase()}${badgeLevel.substring(
    1,
  )} Unique Solutions Badge`;
  return {
    [slug]: {
      slug,
      name: `Completed ${badgeName}`,
      shortName: `Shared`,
    },
  };
};

export const computeSharedBadges = async (badges: AllBadgeObjs, query: SharedTotals[]) => {
  const thresholds: { slug: SolutionBadges; threshold: number }[] = [
    { slug: solutionBadgeKeys[3], threshold: 6 },
    { slug: solutionBadgeKeys[2], threshold: 4 },
    { slug: solutionBadgeKeys[1], threshold: 2 },
    { slug: solutionBadgeKeys[0], threshold: 0 },
  ];
  const total = query?.[0]?.TotalCompleted || 0;
  const [highestBadge] = thresholds.filter((x) => total >= x.threshold);
  if (highestBadge) {
    badges = Object.assign(badges, awardSolutionBadge(highestBadge.slug));
  }
  return badges;
};
