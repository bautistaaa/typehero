import { Prisma, prisma } from '@repo/db';
import { redisClient } from '@repo/redis';
import { getNextAdventDay } from '~/utils/time-utils';
import { LEADERBOARD_RANKING_LIMIT } from './constants';

interface OverallLeaderboardEntry {
  userId: string;
  score: bigint | number;
  name: string;
  image: string | null;
}

export async function getOverallTableData(leaderboard: OverallLeaderboardEntry[]) {
  const userData = await getUserData(leaderboard);
  const rows = leaderboard.map((r) => {
    const user = userData.get(r.userId);
    if (user === undefined) {
      throw new Error(`Leaderboard entry for ${r.name} does not have a matching user record`);
    }
    return {
      name: user.name,
      image: r.image,
      bio: user.bio,
      roles: user.roles,
      score: Number(r.score),
    };
  });
  return rows;
}

async function getUserData(leaderboardEntries: OverallLeaderboardEntry[]) {
  const userData = await prisma.user.findMany({
    where: {
      name: {
        in: leaderboardEntries.map((e) => e.name),
      },
    },
    select: {
      id: true,
      name: true,
      bio: true,
      roles: true,
    },
  });
  const userMap = new Map(userData.map((u) => [u.id, u]));
  return userMap;
}

export async function getOverallLeaderboard(year: number, isPast: boolean) {
  // if (!isPast) {
  //   const cachedRanking = await redisClient.get('aot-overall-leaderboard');
  //
  //   if (cachedRanking) {
  //     return JSON.parse(cachedRanking) as OverallLeaderboardEntry[];
  //   }
  // }

  const challengeIdsSoFar = [1];

  const rankingPromise = prisma.$queryRaw<OverallLeaderboardEntry[]>`
  SELECT
    u.id as userId,
    u.name,
    u.image,
    CAST(SUM(r.points) AS SIGNED) AS score
  FROM
    User u
  JOIN
    (
      SELECT
        userId,
        101 - \`rank\` AS points
      FROM
        (
          SELECT
            userId,
            challengeId,
            ROW_NUMBER() OVER (PARTITION BY challengeId ORDER BY MIN(createdAt)) AS \`rank\`
          FROM Submission
          WHERE challengeId IN (${Prisma.join(challengeIdsSoFar)}) AND isSuccessful = 1
          GROUP BY userId, challengeId
        ) AS RankedSubmissions
      WHERE \`rank\` <= ${LEADERBOARD_RANKING_LIMIT}
    ) r ON u.id = r.userId
  WHERE u.status = 'ACTIVE'
  GROUP BY u.id, u.name, u.image
  ORDER BY score DESC
  LIMIT ${LEADERBOARD_RANKING_LIMIT};`;

  // Prisma doesn't suppport distinct for .count()...
  const challengeIdToday = challengeIdsSoFar.at(-1);
  const numberOfSubmissionsTodayPromise = prisma.$queryRaw<[{ count: number }]>`
    SELECT COUNT(DISTINCT userId) as count
    FROM Submission
    WHERE challengeId = ${challengeIdToday}
    AND isSuccessful = 1`;

  const [ranking, [{ count: numberOfSubmissionsToday }]] = await Promise.all([
    rankingPromise,
    numberOfSubmissionsTodayPromise,
  ]);

  // Once we have top 100 for today, we can cache until midnight (next challenge release)
  if (!isPast && Number(numberOfSubmissionsToday) >= LEADERBOARD_RANKING_LIMIT) {
    await redisClient.set(
      'aot-overall-leaderboard',
      JSON.stringify(ranking, (_, value) => (typeof value === 'bigint' ? value.toString() : value)),
      { PXAT: getNextAdventDay() },
    );
  }
  return ranking;
}
