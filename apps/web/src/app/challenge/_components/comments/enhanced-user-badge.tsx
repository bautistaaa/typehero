'use client';

import { Avatar, AvatarFallback, AvatarImage, DefaultAvatar } from '@repo/ui/components/avatar';
import Link from 'next/link';
import { Badge } from '@repo/ui/components/badge';
import { Shield, Sword, Wand2, type LucideIcon } from '@repo/ui/icons';
import { useQuery } from '@tanstack/react-query';
import { getProfileData } from './enhanced-user-badge.getProfileData';
import { useState } from 'react';
import { type BadgeInfo } from '~/app/actions/badges/_actions';
import { cn } from '@repo/ui/cn';
import { type Role } from '@repo/db/types';
import { Button } from '@repo/ui/components/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@repo/ui/components/hover-card';
import { getGradient, getTitles, type TitleInfo } from './enhanced-user-badge.getTitles';
import { Skeleton } from '@repo/ui/components/skeleton';
// import type { BadgeInfo } from '~/app/(profile)/[username]/user-info';
// import { SlugToBadgeIcon } from '~/app/(profile)/[username]/_components/badges';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip';
import { SlugToBadgeIcon } from '~/app/(profile)/[username]/_components/badges';

interface UserBadgeProps {
  user: {
    name: string;
    roles: Role[];
    bio: string;
    image: string;
  };
}

export function UserBadge(props: UserBadgeProps) {
  const [queryEnabled, setQueryEnabled] = useState(false);
  const query = useQuery({
    queryKey: ['profile-hover-card', props.user.name],
    queryFn: () => getProfileData(props.user.name),
    enabled: queryEnabled,
    staleTime: 60 * 1000,
    initialData: {
      ...props.user,
      id: '',
      badges: [],
      titles: getTitles(props.user.roles),
    },
    initialDataUpdatedAt: 0,
  });
  const onMouseOver = () => {
    setQueryEnabled(true);
  };

  const gradient = getGradient(props.user.roles);
  const shouldShowHoverCard = props.user.bio !== '' || query.data.titles.length > 0;

  return (
    <HoverCardWrapper
      enabled={shouldShowHoverCard}
      usernameComponent={
        <Link href={`/@${props.user.name}`} className="focus:outline-none focus-visible:ring-0">
          <Button
            className="-ml-2 font-bold "
            asChild
            variant="ghost"
            size="xs"
            onMouseOver={onMouseOver}
          >
            <span
              className={cn('bg-gradient-to-r bg-clip-text font-bold text-transparent', gradient)}
            >
              @{props.user.name}
            </span>
          </Button>
        </Link>
      }
      onHoverComponent={
        //When a user does not have a bio & they have no titles, then a compact version is shown
        <Link href={`/@${props.user.name}`}>
          <div className="flex flex-row space-x-2">
            <div className="flex min-w-20 flex-col items-center justify-center space-y-2">
              <div className={cn('w-min rounded-full bg-gradient-to-r p-0.5', gradient)}>
                <Avatar className="h-14 w-14">
                  <AvatarImage src={query.data.image ?? ''} />
                  <AvatarFallback>
                    <DefaultAvatar />
                  </AvatarFallback>
                </Avatar>
              </div>

              {query.isRefetching ? (
                <Skeleton className="h-full w-full" />
              ) : query.data.badges.length > 0 ? (
                <Badges data={query.data.badges} />
              ) : null}
            </div>
            <div className="flex w-max max-w-[calc(39ch)] flex-col space-y-2 ">
              <h1
                className={cn(
                  'w-fit bg-gradient-to-r bg-clip-text font-extrabold text-transparent',
                  gradient,
                )}
              >
                @{props.user.name}
              </h1>

              <Titles data={query.data.titles} />
              <p className="line-clamp-2 text-sm font-light text-zinc-700 dark:text-zinc-300">
                {query.data.bio === '' ? 'This user has no bio' : query.data.bio}
              </p>
            </div>
          </div>
        </Link>
      }
    />
  );
}

const TITLE_TO_ICON: Record<TitleInfo['type'], LucideIcon> = {
  admin: Shield,
  supporter: Sword,
  contributor: Wand2,
};

export function Titles(props: { data: TitleInfo[] }) {
  if (props.data.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-row flex-wrap gap-2">
      {props.data.map((t) => {
        const Icon = TITLE_TO_ICON[t.type];
        return (
          <Tooltip key={t.type}>
            <TooltipTrigger asChild>
              <Badge className="rounded-full bg-gradient-to-br from-sky-600 to-sky-700 px-2  ">
                <Icon className="h-5 w-5 pr-1" />
                {t.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{t.description}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function Badges(props: { data: BadgeInfo[] }) {
  return (
    <div className="flex flex-row space-x-[-15px]">
      {props.data.map((b) => {
        const Icon = SlugToBadgeIcon[b.slug];
        return <Icon className="h-10 w-10" key={b.slug} />;
      })}
    </div>
  );
}

function HoverCardWrapper(props: {
  usernameComponent: React.ReactElement;
  onHoverComponent: React.ReactElement;
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <HoverCard
      open={open}
      onOpenChange={(nextState) => {
        if (props.enabled) {
          setOpen(nextState);
        }
      }}
    >
      <HoverCardTrigger asChild>{props.usernameComponent}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="bottom"
        avoidCollisions
        className="w-min rounded-lg bg-zinc-100 dark:bg-zinc-900"
      >
        {props.onHoverComponent}
      </HoverCardContent>
    </HoverCard>
  );
}
