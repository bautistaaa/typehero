'use client';

import { getRelativeTimeStrict } from '~/utils/relativeTime';

export default function RelativeTime({ date }: { date: Date }) {
  return <>{getRelativeTimeStrict(date)}</>;
}
