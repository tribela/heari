'use client';

import { Share2, ClipboardCopy, Check } from 'lucide-react';
import { SiMastodon, SiMisskey } from 'react-icons/si';
import TooltipButton from '@/components/tooltip-button';

type Props = {
  attempts: number;
  streak: number;
  longestStreak: number;
  shareText: string;
  onCopy: () => void;
  onShareFedi: () => void;
  copied: boolean;
};

export default function SolvedCard({
  attempts,
  streak,
  longestStreak,
  shareText,
  onCopy,
  onShareFedi,
  copied,
}: Props) {
  return (
    <div className="mt-6 animate-pop-in rounded-xl border border-green-200 bg-green-50 px-6 py-6 text-center dark:border-green-800 dark:bg-green-950">
      <p className="text-2xl font-bold text-green-700 dark:text-green-400">
        정답입니다!
      </p>
      <p className="mt-2 text-green-600 dark:text-green-400">
        {attempts}번 만에 맞추셨어요
      </p>
      <p className="mt-1 text-sm text-green-500 dark:text-green-500">
        {streak}일 연속 정답
        {longestStreak > streak && (
          <span className="ml-2 text-green-400">최고 {longestStreak}일</span>
        )}
      </p>
      <div className="mt-4">
        <textarea
          className="w-full resize-none rounded-lg border border-green-200 bg-white/50 p-3 text-xs text-zinc-600 dark:border-green-800 dark:bg-zinc-900/50 dark:text-zinc-400"
          value={shareText}
          readOnly
          rows={5}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <Share2 className="mr-1 h-5 w-5 text-green-600 dark:text-green-400" />
        <TooltipButton
          tooltip="클립보드에 복사"
          className="rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
          onClick={onCopy}
        >
          {copied ? <Check className="h-5 w-5" /> : <ClipboardCopy className="h-5 w-5" />}
        </TooltipButton>
        <TooltipButton
          tooltip="마스토돈/미스키로 공유"
          className="rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
          onClick={onShareFedi}
        >
          <span className="flex items-center gap-1.5">
            <SiMastodon className="h-5 w-5" />
            <SiMisskey className="h-5 w-5" />
          </span>
        </TooltipButton>
      </div>
    </div>
  );
}
