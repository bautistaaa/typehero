import { faker } from '@faker-js/faker';
import { PrismaClient, type Challenge, type Prisma } from '@prisma/client';
import uuidByString from 'uuid-by-string';
import { loadChallengesFromTypeChallenge } from '../mocks/challenges.mock';
import { createComment } from '../mocks/comment.mock';
import { createUsers } from '../mocks/user.mock';
import { tracks } from './data/tracks';

const prisma = new PrismaClient();

export const slugify = (str: string) => str.toLowerCase().replace(/\s/g, '-');
export const trashId = uuidByString('trash');
export const gId = uuidByString('g');

try {
  await prisma.user.createMany({
    data: createUsers(15),
  });

  const challengesFromTypeChallenges = await loadChallengesFromTypeChallenge();
  const users = await prisma.user
    .findMany({
      select: {
        id: true,
      },
    })
    .then((r) => r.map((u) => u.id));

  await prisma.challenge.createMany({
    data: challengesFromTypeChallenges.map((challenge) => ({
      ...challenge,
      userId: faker.helpers.arrayElement(users),
    })),
  });

  for (const [index, track] of tracks.entries()) {
    const challenges = await getRandomChallenges(index);

    const createdTrack = await prisma.track.create({
      data: {
        name: track.name,
        slug: slugify(track.name),
        description: track.description,
        visible: true,
      },
    });

    await prisma.trackChallenge.createMany({
      data: challenges.map((challenge, index) => ({
        challengeId: challenge.id,
        trackId: createdTrack.id,
        orderId: index,
      })),
    });
  }
  const someChallenge = await prisma.challenge.findFirst({
    where: {
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { id: trashId },
    update: {},
    create: {
      id: trashId,
      email: 'chris@typehero.dev',
      name: 'chris',
      sharedSolution: {
        create: alotOfSharedSolutions(someChallenge?.id ?? 2),
      },
    },
  });

  let commentNum = 0;
  const comments = Array.from({ length: 50 }, () => createComment(++commentNum));

  const replies: Prisma.CommentCreateManyInput[] = [];

  const { comment: createdComments } = await prisma.challenge.update({
    where: { id: someChallenge?.id },
    include: {
      comment: true,
    },
    data: {
      comment: {
        create: comments,
      },
    },
  });

  for (const comment of createdComments) {
    replies.push(createComment(++commentNum, comment.id), createComment(++commentNum, comment.id));
  }

  await prisma.challenge.update({
    where: { id: someChallenge?.id },
    data: {
      comment: {
        create: replies,
      },
    },
  });

  const badgeALotId = '420';
  await prisma.user.upsert({
    where: { id: badgeALotId },
    update: {},
    create: {
      id: badgeALotId,
      email: 'test@test.com',
      name: 'sir_badge_a_lot',
      sharedSolution: {
        create: aLotOfSharedSolutionsManyChallenges(challengesFromTypeChallenges),
      },
      submission: {
        create: aLotOfSubmissionsManyChallenges(challengesFromTypeChallenges),
      },
    },
  });
  await prisma.$disconnect();
} catch (e) {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
}

async function getRandomChallenges(iteration: number): Promise<Challenge[]> {
  const challenges = await prisma.challenge.findMany({
    take: 10,
    skip: 10 * iteration,
  });
  return challenges;
}

function alotOfSharedSolutions(challengeId: number) {
  return Array.from({ length: 50 }, () => ({
    challengeId,
    title: faker.lorem.words(7),
    description: faker.lorem.words({ min: 5, max: 25 }),
  }));
}
function aLotOfSharedSolutionsManyChallenges(
  challengeIds: Omit<Prisma.ChallengeCreateManyInput, 'userId'>[],
) {
  return challengeIds.map((challenge) => ({
    challengeId: challenge.id,
    title: faker.lorem.words(7),
    description: faker.lorem.words({ min: 5, max: 25 }),
  }));
}
function aLotOfSubmissionsManyChallenges(
  challengeIds: Omit<Prisma.ChallengeCreateManyInput, 'userId'>[],
) {
  return challengeIds.map((challenge) => ({
    challengeId: challenge.id || 0,
    code: faker.lorem.words(7),
    isSuccessful: true,
    createdAt: new Date(),
  }));
}
