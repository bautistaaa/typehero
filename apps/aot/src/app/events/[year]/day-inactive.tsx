'use client';

import { motion } from 'framer-motion';

const colorsArray = [
  'from-blue-200 dark:from-blue-800 via-blue-600 dark:via-blue-400 to-blue-100 dark:to-blue-900',
  'from-green-200 dark:from-green-800 via-green-600 dark:via-green-400 to-green-100 dark:to-green-900',
  'from-yellow-200 dark:from-yellow-800 via-yellow-600 dark:via-yellow-400 to-yellow-100 dark:to-yellow-900',
  'from-red-200 dark:from-red-800 via-red-600 dark:via-red-400 to-red-100 dark:to-red-900',
  'from-purple-200 dark:from-purple-800 via-purple-600 dark:via-purple-400 to-purple-100 dark:to-purple-900',
  'from-pink-200 dark:from-pink-800 via-pink-600 dark:via-pink-400 to-pink-100 dark:to-pink-900',
];

export default function DayInactive({ day }: { day: number }) {
  return (
    <motion.div
      key={day}
      initial={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: day * 0.025, type: 'spring', damping: 3, stiffness: 100 }}
      className="group aspect-square rounded-xl p-[1.5px] duration-300 hover:scale-110 hover:rounded-2xl"
    >
      <div
        className={`relative grid aspect-square h-12 w-12 cursor-wait place-items-center overflow-hidden rounded-xl border-2 border-dashed border-white/30 bg-white/70 backdrop-blur duration-300 group-hover:rounded-2xl group-hover:bg-white/50 dark:bg-black/20 dark:group-hover:bg-black/50 ${
          day === 22 && 'h-14'
        }`}
      >
        <h1 className="z-10 font-bold">{day}</h1>
      </div>
    </motion.div>
  );
}
