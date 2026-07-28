'use client';

import { useState } from 'react';
import { useGame } from '@/lib/hooks/use-game';
import NotificationBell from '@/components/notification-bell';
import JamoGrid from '@/components/jamo-grid';
import LogList from '@/components/log-list';
import SolvedCard from '@/components/solved-card';
import FediModal from '@/components/fedi-modal';
import TooltipButton from '@/components/tooltip-button';

export default function Home() {
  const game = useGame();
  const [copied, setCopied] = useState(false);
  const [fediInstance, setFediInstance] = useState('');
  const [showFediInput, setShowFediInput] = useState(false);

  if (!game.game) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  const d = game.game;

  const shareLines = (): string[] => {
    const lines = [
      `${d.date} 헤아리 "${d.chosung}"`,
    ];
    if (game.selectedHint) lines.push(game.selectedHint);
    lines.push(`${game.attempts}번의 헤아림${game.hintCount > 0 ? ` (도움 ${game.hintCount}회)` : ''}`);
    lines.push(window.location.origin);
    lines.push('');
    lines.push('#헤아리');
    return lines;
  };

  const share = async () => {
    const text = shareLines().join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const shareFedi = () => {
    setFediInstance(localStorage.getItem('fedi_instance') ?? '');
    setShowFediInput(true);
  };

  const confirmFediInstance = (instance: string) => {
    localStorage.setItem('fedi_instance', instance);
    setFediInstance(instance);
    setShowFediInput(false);
    const lines = shareLines();
    window.open(
      `https://${instance}/share?text=${encodeURIComponent(lines.join('\n'))}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <>
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-12 animate-fade-in">
      <div className="relative mb-1 flex items-center justify-center">
        <h1 className="text-center text-3xl font-bold tracking-tight">헤아리</h1>
        <div className="absolute right-0">
          <NotificationBell key={game.notifKey} />
        </div>
      </div>
      <p className="mb-1 text-center text-sm text-zinc-500 dark:text-zinc-400">초성을 보고 단어를 맞춰보세요</p>
      <p className="mb-6 text-center text-xs text-zinc-400 dark:text-zinc-500">{d.date}</p>

      {!game.hintJamos ? (
        <div className="mb-6 text-center">
          <div className="text-7xl font-bold tracking-widest text-zinc-800 dark:text-zinc-200">
            {d.chosung.split('').map((c, i) => (
              <span key={i} className="chosung-char mx-1" style={{ animationDelay: `${i * 0.12}s` }}>{c}</span>
            ))}
          </div>
        </div>
      ) : (
        <JamoGrid
          jamos={game.hintJamos}
          hintRevealed={game.hintRevealed!}
          initialJamoRevealed={game.initialJamoRevealed!}
          hintCount={game.hintCount}
          isActive={game.isActive}
          onReveal={game.revealJamo}
        />
      )}

      <div className="flex w-full gap-2">
        <div className="relative flex-1">
          <input
            ref={game.inputRef}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 focus:border-zinc-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400"
            value={game.input}
            onChange={e => game.setInput(e.target.value)}
            onKeyDown={game.handleKeyDown}
            placeholder="정답 입력"
            disabled={!game.isActive}
          />
          {game.dupMsg && (
            <p className="absolute -bottom-6 left-0 text-xs text-orange-600 dark:text-orange-400">
              {game.dupMsg}
            </p>
          )}
        </div>
        <TooltipButton
          tooltip="단어의 자모를 분리하여 보여줍니다. 각 칸을 눌러 하나씩 알아낼 수 있어요"
          className="rounded-lg border border-zinc-300 px-3 py-3 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          onClick={game.openHint}
          disabled={!game.isActive || !!game.hintJamos}
        >
          {!game.hintJamos ? '힌트' : `${game.hintCount}회 사용`}
        </TooltipButton>
        <button
          className="rounded-lg bg-zinc-800 px-6 py-3 text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          onClick={game.submitGuess}
          disabled={!game.isActive || !game.input.trim()}
        >
          확인
        </button>
      </div>

      {game.loading && (
        <p className="mt-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
          힌트 생성 중
          <span className="loading-dot ml-0.5">•</span>
          <span className="loading-dot">•</span>
          <span className="loading-dot">•</span>
        </p>
      )}

      {game.solved && (
        <SolvedCard
          attempts={game.attempts}
          streak={game.streak}
          longestStreak={game.longestStreak}
          shareText={shareLines().join('\n')}
          onCopy={share}
          onShareFedi={shareFedi}
          copied={copied}
        />
      )}

      <LogList
        logs={game.logs}
        solved={game.solved}
        selectedHint={game.selectedHint}
        onToggleHint={game.toggleHintSelection}
      />
    </div>

    {showFediInput && (
      <FediModal
        initialValue={fediInstance}
        onConfirm={confirmFediInstance}
        onClose={() => setShowFediInput(false)}
      />
    )}
    </>
  );
}
