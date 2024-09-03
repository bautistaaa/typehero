import { prisma } from '@repo/db';
import { notFound } from 'next/navigation';
import { buildMetaForDefault, buildMetaForUser } from '~/app/metadata';
import { getRelativeTimeStrict } from '~/utils/relativeTime';
import { OverviewTab } from './_components/dashboard/overview-tab';

interface Props {
  params: {
    username: string;
  };
}

export default async function Page({ params: { username: usernameFromQuery } }: Props) {
  const [, username] = decodeURIComponent(usernameFromQuery).split('@');

  if (!username) return notFound();

  const user = await prisma.user.findFirst({
    where: {
      name: {
        equals: username,
      },
    },
    select: {
      id: true,
      createdAt: true,
      bio: true,
      image: true,
      name: true,
      userLinks: true,
    },
  });

  if (!user) return notFound();
  return <OverviewTab user={user} />;
}

export async function generateMetadata({ params: { username: usernameFromQuery } }: Props) {
  const [, username] = decodeURIComponent(usernameFromQuery).split('@');

  if (!username) return {};

  const user = await prisma.user.findFirst({
    where: {
      name: {
        equals: username,
      },
    },
    select: {
      id: true,
      createdAt: true,
      bio: true,
      image: true,
      name: true,
    },
  });

  const avatar = user && user.image ? user.image : '';
  const date = user?.createdAt!;
  const dateSince = getRelativeTimeStrict(date);

  if (username)
    return buildMetaForUser({
      username,
      title: `${username}'s profile | TypeHero`,
      description: `View the profile of ${username} on TypeHero.`,
      avatar,
      dateSince,
    });
  return buildMetaForDefault({
    title: 'Profile | TypeHero',
    description: 'View the profile of a user on TypeHero.',
  });
}
