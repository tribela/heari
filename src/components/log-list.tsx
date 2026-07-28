'use client';

import type { LogEntry } from '@/lib/game-types';

type Props = {
  logs: LogEntry[];
  solved: boolean;
  selectedHint: string | null;
  onToggleHint: (index: number) => void;
};

export default function LogList({ logs, solved, selectedHint, onToggleHint }: Props) {
  if (logs.length === 0) return null;

  return (
    <div className="mt-6 w-full space-y-2">
      {logs.map((entry, i) => {
        const hintStr = 'hint' in entry.result ? entry.result.hint : '';
        const hasHint = hintStr.length > 0;
        return (
          <div
            key={i}
            className={`log-enter rounded-lg border px-4 py-3 text-sm transition-colors ${
              entry.result.correct
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                : selectedHint !== null && hasHint && hintStr === selectedHint
                ? 'cursor-pointer border-green-300 bg-green-50/50 text-zinc-700 dark:border-green-600 dark:bg-green-950/50 dark:text-zinc-300'
                : hasHint
                ? 'cursor-pointer border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/50'
                : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
            onClick={() => solved && entry.result.valid && hasHint && onToggleHint(i)}
          >
            <span className="mr-1 text-xs text-zinc-300 dark:text-zinc-600">
              {entry.attempt ?? (logs.length - i)}.
            </span>
            <span className="font-medium">
              {entry.jamoState ? (
                <>
                  <span className="mr-1">{entry.input}</span>
                  {entry.jamoState.jamos.map((jamo, ji) => {
                    const isNew =
                      entry.jamoState!.newIndex !== undefined &&
                      ji === entry.jamoState!.newIndex;
                    return (
                      <span
                        key={ji}
                        className={`inline-flex items-center justify-center w-4 h-4 rounded-[3px] text-[11px] leading-none mx-px ${
                          entry.jamoState!.revealed[ji]
                            ? isNew
                              ? 'font-bold text-white bg-blue-600 dark:text-white dark:bg-blue-500 scale-110'
                              : 'text-zinc-700 dark:text-zinc-300'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      >
                        {entry.jamoState!.revealed[ji] ? jamo : '·'}
                      </span>
                    );
                  })}
                </>
              ) : (
                entry.input
              )}
            </span>
            <span className="ml-2 text-zinc-400 dark:text-zinc-500">
              {entry.result.correct
                ? '정답!'
                : !entry.result.valid
                ? '— ' + entry.result.reason
                : hasHint
                ? '— ' + hintStr
                : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
