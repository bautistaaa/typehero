import Link from 'next/link';
import { getCurrentAdventDay } from '~/utils/time-utils';

export default function AdventDaysRow({ selectedDay }: { selectedDay?: number }) {
  const currentAdventDay = getCurrentAdventDay();

  return (
    <div className="flex w-full gap-2 text-xl">
      <p>Per day:</p>
      <ul className="flex flex-wrap gap-2">
        {Array.from({ length: currentAdventDay }, (_, index) => {
          const day = index + 1;
          return (
            <li key={day}>
              <Link
                href={`/leaderboard/day/${day}`}
                className={`hover:text-blue-400 ${
                  day === selectedDay ? 'font-bold text-blue-600' : ''
                }`}
              >
                {day}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
