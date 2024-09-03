'use client';

import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { getRelativeTimeStrict } from '~/utils/relativeTime';
import type { BookmarkedChallenge } from '../page';

export const bookmarkedChallengedColumns: ColumnDef<BookmarkedChallenge>[] = [
  {
    accessorFn: (bookmark) => bookmark.challenge?.name,
    header: 'Title',
    cell: ({ row }) => (
      <Link className="underline" href={`/challenge/${row.original.challenge?.slug}`}>
        {row.original.challenge?.name}
      </Link>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => getRelativeTimeStrict(row.original.createdAt!),
  },
];
