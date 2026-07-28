'use client';

type Props = {
  jamos: string[];
  hintRevealed: boolean[];
  initialJamoRevealed: boolean[];
  hintCount: number;
  isActive: boolean;
  onReveal: (index: number) => void;
};

export default function JamoGrid({ jamos, hintRevealed, initialJamoRevealed, hintCount, isActive, onReveal }: Props) {
  const groups: { jamos: string[]; revealed: boolean[]; start: number }[] = [];
  let cur: (typeof groups)[number] | null = null;
  for (let i = 0; i < jamos.length; i++) {
    if (initialJamoRevealed[i]) {
      if (cur) groups.push(cur);
      cur = { jamos: [jamos[i]], revealed: [hintRevealed[i]], start: i };
    } else if (cur) {
      cur.jamos.push(jamos[i]);
      cur.revealed.push(hintRevealed[i]);
    }
  }
  if (cur) groups.push(cur);

  return (
    <div className="mb-6 text-center">
      <div className="mx-auto flex flex-wrap justify-center gap-x-6 gap-y-3">
        {groups.map((group, gi) => (
          <div key={gi} className="flex gap-1">
            {group.jamos.map((jamo, ji) => {
              const flatIdx = group.start + ji;
              return (
                <div
                  key={ji}
                  className={`animate-pop-in flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xl font-bold transition-all duration-200 sm:h-14 sm:w-14 sm:text-2xl ${
                    group.revealed[ji]
                      ? 'border-zinc-300 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200'
                      : 'cursor-pointer border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
                  }`}
                  onClick={() => isActive && !group.revealed[ji] && onReveal(flatIdx)}
                  style={{ animationDelay: `${flatIdx * 0.06}s` }}
                >
                  {group.revealed[ji] ? jamo : '?'}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        ?를 눌러 힌트를 공개하세요 ({hintCount}회 사용)
      </p>
    </div>
  );
}
