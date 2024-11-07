import { prisma } from '@repo/db';
import type { Difficulty as DifficultyWithEvent } from '@repo/db/types';
import {
  eachDayOfInterval,
  getDay,
  getMonth,
  getWeek,
  isSameDay,
  startOfWeek,
  subDays,
} from 'date-fns';

type Difficulty = Exclude<DifficultyWithEvent, 'EVENT'>;

export async function getProgressData(userId: string) {
  // Get all successful submissions for the user
  const successfulSubmissions = await prisma.submission.findMany({
    where: {
      userId,
      isSuccessful: true,
      challenge: {
        NOT: {
          difficulty: 'EVENT',
        },
      },
    },
    select: {
      challenge: {
        select: {
          id: true,
        },
      },
    },
    distinct: ['challengeId'],
  });

  // Get all challenges solved and group by difficulty
  const challengesSolved = await prisma.challenge.groupBy({
    by: ['difficulty'],
    where: {
      id: {
        // if the user has solved challenge, it will be in the successfulSubmissions array
        in: successfulSubmissions.map((challenge) => challenge.challenge.id),
      },
    },
    _count: {
      _all: true,
    },
  });

  const allChallenges = await prisma.challenge.groupBy({
    where: {
      NOT: {
        difficulty: 'EVENT',
      },
    },
    by: ['difficulty'],
    _count: {
      _all: true,
    },
  });

  // Calculate percentage, total solved and total challenges
  const totalSolved = challengesSolved.reduce((acc, challenge) => acc + challenge._count._all, 0);
  const totalChallenges = allChallenges.reduce((acc, challenge) => acc + challenge._count._all, 0);

  const chartData: {
    difficulty: Difficulty;
    completedPercentage: number;
    completed: number;
    fill: string;
    total: number;
  }[] = [];

  // assign values to the challenges object
  allChallenges.forEach((challenge) => {
    const solved =
      challengesSolved.find((solvedC) => solvedC.difficulty === challenge.difficulty)?._count
        ._all ?? 0;

    chartData.push({
      difficulty: challenge.difficulty as Difficulty,
      completed: solved,
      completedPercentage: Math.round((solved / challenge._count._all) * 100),
      fill: `var(--color-${challenge.difficulty})`,
      total: challenge._count._all,
    });
  });
  const difficultyOrder = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXTREME'] as const;
  chartData.sort(
    (a, b) => difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty),
  );
  console.log({ totalChallenges });
  return {
    chartData,
    totalSolved,
    totalChallenges,
  };
}

export async function getUserActivity(userId: string) {
  const endDate = new Date();
  const startDate = startOfWeek(subDays(endDate, 60), { weekStartsOn: 0 });

  const user = await prisma.user.findFirstOrThrow({
    where: { id: userId },
    select: {
      submission: {
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      },
      comment: {
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      },
    },
  });
  const days = eachDayOfInterval({ start: startDate, end: endDate }).map((date) => {
    const comments = user.comment.filter((c) => isSameDay(c.createdAt, date)).length;
    const badges = 0;
    const submissions = user.submission.filter((s) => isSameDay(s.createdAt, date)).length;
    const activity = comments + badges + submissions;
    return {
      date,
      day: getDay(date),
      week: getWeek(date),
      month: getMonth(date),
      submissions,
      comments,
      badges,
      activity,
    };
  });

  return days;
}
