import type { AllBadgeObjs, BadgesFn } from '../_actions';
import { prisma } from '@repo/db';

export interface AdventChallenges {
  trackChallenges: { challenge: { submission: { isSuccessful: boolean }[] } }[];
}

export const aotBadgeKeys = [
  'aot-2023-bronze',
  'aot-2023-silver',
  'aot-2023-gold',
  'aot-2023-platinum',
] as const;

export type AotBadges = (typeof aotBadgeKeys)[number];

export const adventBadgesFn: BadgesFn = async ({
  userId,
  badges,
}: {
  userId: string;
  badges: AllBadgeObjs;
}): Promise<AllBadgeObjs> => {
  const advent: AdventChallenges | null = await adventRetrieveData(userId);
  return await computeAdventBadges(badges, advent);
};
export async function adventRetrieveData(userId: string) {
  const advent: AdventChallenges | null = await prisma.track.findFirst({
    where: {
      slug: 'advent-of-typescript-2023',
    },
    include: {
      trackChallenges: {
        orderBy: {
          orderId: 'asc',
        },
        include: {
          challenge: {
            include: {
              submission: {
                where: {
                  userId,
                },
              },
            },
          },
        },
      },
      enrolledUsers: {
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      },
    },
  });
  return advent;
}

export const awardAdventBadges = (slug: AotBadges) => {
  const badgeColor = slug.split('-')?.[2] ?? '';
  const badgeLevel = `${badgeColor[0]?.toUpperCase()}${badgeColor.substring(1)}`;
  return {
    [slug]: {
      slug,
      name: `Advent of Typescript 2023 ${badgeLevel}`,
      shortName: 'Advent',
    },
  };
};

export const computeAdventBadges = async (
  badges: AllBadgeObjs,
  advent: AdventChallenges | null,
) => {
  // Advent Badge Logic
  const attemptedChallenges =
    advent?.trackChallenges.filter((trackChallenge) => {
      return (trackChallenge.challenge.submission?.length ?? 0) > 0;
    }).length ?? 0;

  const completedChallenges =
    advent?.trackChallenges.filter((trackChallenge) => {
      return trackChallenge.challenge.submission?.some((submission) => submission.isSuccessful);
    }).length ?? 0;

  let badgeLevel: 'bronze' | 'gold' | 'platinum' | 'silver' | undefined;
  if (attemptedChallenges > 0) {
    badgeLevel = 'bronze';
  }
  if (completedChallenges >= 5) {
    badgeLevel = 'silver';
  }
  if (completedChallenges >= 15) {
    badgeLevel = 'gold';
  }
  if (completedChallenges >= 25) {
    badgeLevel = 'platinum';
  }
  if (badgeLevel) {
    Object.assign(badges, awardAdventBadges(`aot-2023-${badgeLevel}`));
  }
  return badges;
};
