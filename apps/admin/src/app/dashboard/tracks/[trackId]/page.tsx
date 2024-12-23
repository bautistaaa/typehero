import { prisma } from '@repo/db';
import { auth } from '~/server/auth';
import { assertAdmin } from '~/utils/auth-guards';
import { UpdateTrackForm } from './_components/update-track-form';

type Params = Promise<{
  trackId: string;
}>;

export default async function ({ params }: { params: Params }) {
  const { trackId } = await params;
  const session = await auth();
  assertAdmin(session);

  const track = await getTrackById(Number(trackId));
  const challenges = await getChallenges();

  return <UpdateTrackForm track={track} challenges={challenges} />;
}

export type TrackToManage = NonNullable<Awaited<ReturnType<typeof getTrackById>>>;
const getTrackById = (id: number) => {
  return prisma.track.findFirstOrThrow({
    where: {
      id,
    },
    include: {
      trackChallenges: true,
    },
  });
};

export type ChallengesForTrack = NonNullable<Awaited<ReturnType<typeof getChallenges>>>;
function getChallenges() {
  return prisma.challenge.findMany({
    where: {
      status: 'ACTIVE',
    },
  });
}
