import { prisma } from '@repo/db';
import type { AllBadgeObjs, BadgesFn } from '~/app/actions/badges/_actions';

export const difficultyBadgeKeys = [
  'all-easy-completed',
  'all-medium-completed',
  'all-hard-completed',
  'all-extreme-completed',
] as const;

export type DifficultyBadges = (typeof difficultyBadgeKeys)[number];
export interface Difficulty {
  Difficulty: DifficultyBadges;
  TotalCompleted: number;
}

export const difficultyBadgesFn: BadgesFn = async ({
  userId,
  badges,
}: {
  userId: string;
  badges: AllBadgeObjs;
}) => {
  // DifficultyBadges
  const difficulty: Difficulty[] | null = await difficultyRetrieveData(userId);
  const challenges = await challengesRetrieveData();
  return await computeDifficultyBadge(badges, difficulty ?? [], challenges);
};

export async function difficultyRetrieveData(userId: string) {
  return prisma.$queryRaw<
    Difficulty[]
  >`SELECT Difficulty, COUNT(Id) as TotalCompleted FROM (SELECT DISTINCT Difficulty, Challenge.Id FROM Submission JOIN Challenge ON Submission.challengeId = Challenge.Id WHERE Submission.userId = ${userId} AND IsSuccessful = 1) unique_query GROUP BY Difficulty `;
}
export async function challengesRetrieveData() {
  return prisma.challenge.groupBy({
    by: ['difficulty'],
    _count: {
      id: true,
    },
  });
}

export const awardDifficultyBadge = (slug: DifficultyBadges) => {
  const badgeLevel = `${slug.split('-')[1]}`;
  const pascalCase = `${badgeLevel[0]?.toUpperCase()}${badgeLevel.substring(1).toLowerCase()}`;
  return {
    [slug]: {
      slug,
      name: `Completed ${pascalCase} Difficulty Badge`,
      shortName: badgeLevel?.toLowerCase(),
    },
  };
};

export const computeDifficultyBadge = async (
  badges: AllBadgeObjs,
  query: Difficulty[],
  challenges: { _count: { id: number }; difficulty: string }[],
) => {
  const highNumberOnError = 1_000_000;
  const thresholds: { difficulty: 'EASY' | 'EXTREME' | 'HARD' | 'MEDIUM'; threshold: number }[] = [
    {
      difficulty: 'EASY',
      threshold:
        challenges.find(({ difficulty }: { difficulty: string }) => difficulty === 'EASY')?._count
          ?.id ?? highNumberOnError,
    },
    {
      difficulty: 'MEDIUM',
      threshold:
        challenges.find(({ difficulty }: { difficulty: string }) => difficulty === 'MEDIUM')?._count
          ?.id ?? highNumberOnError,
    },
    {
      difficulty: 'HARD',
      threshold:
        challenges.find(({ difficulty }: { difficulty: string }) => difficulty === 'HARD')?._count
          ?.id ?? highNumberOnError,
    },
    {
      difficulty: 'EXTREME',
      threshold:
        challenges.find(({ difficulty }: { difficulty: string }) => difficulty === 'EXTREME')
          ?._count?.id ?? highNumberOnError,
    },
  ];
  const convertToBadgeName = {
    EASY: difficultyBadgeKeys[0],
    MEDIUM: difficultyBadgeKeys[1],
    HARD: difficultyBadgeKeys[2],
    EXTREME: difficultyBadgeKeys[3],
  };
  query.forEach((currQuery) => {
    const levelThreshold = thresholds.find(
      (x) => x.difficulty.toUpperCase() === currQuery.Difficulty,
    );
    const completedAllChallenges = levelThreshold?.threshold === Number(currQuery.TotalCompleted);
    if (completedAllChallenges) {
      const badgeName =
        convertToBadgeName[currQuery?.Difficulty as 'EASY' | 'EXTREME' | 'HARD' | 'MEDIUM'];
      badges = Object.assign(badges, awardDifficultyBadge(badgeName));
    }
  });
  return badges;
};
