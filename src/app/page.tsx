'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Share2, ClipboardCopy, Check } from 'lucide-react';
import { SiMastodon, SiMisskey } from 'react-icons/si';

type GameData = {
  chosung: string;
  date: string;
};

type GuessResult =
  | { correct: true; valid: true; date: string }
  | { correct: false; valid: false; reason: string; date: string }
  | { correct: false; valid: true; hint: string; date: string };

type LogEntry = {
  input: string;
  result: GuessResult;
  attempt: number;
};

const CHOSUNG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ',
  'ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ',
  'ㅌ','ㅍ','ㅎ',
];

function extractChosung(word: string): string {
  let r = '';
  for (const ch of word) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code >= 0 && code < 11172) r += CHOSUNG[Math.floor(code / 588)];
  }
  return r;
}

export default function Home() {
  const [game, setGame] = useState<GameData | null>(null);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dupMsg, setDupMsg] = useState('');
  const [fediInstance, setFediInstance] = useState('');
  const [showFediInput, setShowFediInput] = useState(false);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [hintJamos, setHintJamos] = useState<string[] | null>(null);
  const [hintRevealed, setHintRevealed] = useState<boolean[] | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [selectedHint, setSelectedHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fediRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('heari_state');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        if (state.date) {
          fetch('/api/game')
            .then(r => r.json())
            .then((data: GameData) => {
              setGame(data);
              if (state.date === data.date && state.chosung === data.chosung) {
                setAttempts(state.attempts ?? 0);
                setSolved(state.solved ?? false);
                setLogs(state.logs ?? []);
                if (state.hintJamos) setHintJamos(state.hintJamos);
                if (state.hintRevealed) setHintRevealed(state.hintRevealed);
                if (state.hintCount) setHintCount(state.hintCount);
              } else {
                localStorage.removeItem('heari_state');
              }
            });
          return;
        }
      } catch { /* ignore */ }
    }
    fetch('/api/game')
      .then(r => r.json())
      .then((data: GameData) => setGame(data));
    setFediInstance(localStorage.getItem('fedi_instance') ?? '');
    const s = localStorage.getItem('heari_streak');
    if (s) {
      try {
        const { current, longest } = JSON.parse(s);
        setStreak(current ?? 0);
        setLongestStreak(longest ?? 0);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!game) return;
    localStorage.setItem('heari_state', JSON.stringify({
      date: game.date,
      chosung: game.chosung,
      attempts,
      solved,
      logs,
      hintJamos,
      hintRevealed,
      hintCount,
    }));
  }, [game, attempts, solved, logs, hintJamos, hintRevealed, hintCount]);

  useEffect(() => {
    if (!solved && !loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [solved, loading]);

  useEffect(() => {
    if (showFediInput && fediRef.current) {
      fediRef.current.focus();
    }
  }, [showFediInput]);

  const onDateMismatch = useCallback(() => {
    setDupMsg('새로운 날의 문제가 시작되었습니다!');
    setAttempts(0);
    setSolved(false);
    setLogs([]);
    setInput('');
    setHintJamos(null);
    setHintRevealed(null);
    setHintCount(0);
    setSelectedHint(null);
    localStorage.removeItem('heari_state');
    fetch('/api/game').then(r => r.json()).then(d => setGame(d));
    setTimeout(() => setDupMsg(''), 3000);
  }, []);

  const submit = useCallback(async () => {
    const val = input.trim();
    if (!val || loading || solved || !game) return;

    if (logs.some(e => e.input === val)) {
      setDupMsg('이미 시도한 단어입니다');
      setInput('');
      setTimeout(() => setDupMsg(''), 2000);
      return;
    }

    if (extractChosung(val) !== game.chosung || val.length !== game.chosung.length) {
      setDupMsg('초성이 맞지 않습니다');
      setInput('');
      setTimeout(() => setDupMsg(''), 2000);
      return;
    }

    const prevAttempts = attempts;
    setLoading(true);
    setDupMsg('');

    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: val }),
      });
      const data: GuessResult = await res.json();

      if (data.date !== game.date) {
        onDateMismatch();
        setLoading(false);
        return;
      }

      if (data.valid) {
        setAttempts(prevAttempts + 1);
      }
      if (data.correct) {
        setSolved(true);
        const today = game.date;
        const parts = today.split('-').map(Number);
        const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        d.setUTCDate(d.getUTCDate() - 1);
        const yesterday = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        const s = localStorage.getItem('heari_streak');
        let cur = 1;
        if (s) {
          try {
            const prev = JSON.parse(s);
            if (prev.lastDate === yesterday) cur = (prev.current ?? 0) + 1;
            else if (prev.lastDate === today) cur = prev.current ?? 1;
          } catch { /* ignore */ }
        }
        const longest = Math.max(cur, longestStreak);
        setStreak(cur);
        setLongestStreak(longest);
        localStorage.setItem('heari_streak', JSON.stringify({ current: cur, longest, lastDate: today }));
      }
      setLogs(l => [{ input: val, result: data, attempt: (data.valid ? prevAttempts + 1 : prevAttempts) }, ...l]);
      if (data.valid && 'hint' in data) setSelectedHint(data.hint);
    } catch { /* ignore */ }
    setLoading(false);
    setInput('');
  }, [input, loading, solved, game, attempts, logs]);

  const fetchHint = useCallback(async () => {
    if (!game || solved || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hint');
      const data = await res.json();
      if (data.date !== game.date) {
        onDateMismatch();
        setLoading(false);
        return;
      }
      setHintJamos(data.jamos);
      setHintRevealed(data.initialRevealed);
      setAttempts(a => a + 1);
      setHintCount(c => c + 1);
    } catch { /* ignore */ }
    setLoading(false);
  }, [game, solved, loading]);

  const revealJamo = useCallback((index: number) => {
    if (!hintRevealed || hintRevealed[index] || loading) return;
    setHintRevealed(prev => {
      const next = [...prev!];
      next[index] = true;
      return next;
    });
    setAttempts(a => a + 1);
    setHintCount(c => c + 1);
  }, [hintRevealed, loading]);

  const toggleHintSelection = useCallback((index: number) => {
    const entry = logs[index];
    if (!entry.result.valid || !('hint' in entry.result)) return;
    const hint = (entry.result as { hint: string }).hint;
    setSelectedHint(prev => prev === hint ? null : hint);
  }, [logs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const share = async () => {
    if (!game) return;
    const text = shareLines().join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const shareFedi = () => setShowFediInput(true);

  const confirmFediInstance = () => {
    const val = fediRef.current?.value.trim();
    if (!val) return;
    localStorage.setItem('fedi_instance', val);
    setFediInstance(val);
    setShowFediInput(false);
    const lines = shareLines();
    window.open(`https://${val}/share?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  const shareLines = () => {
    if (!game) return [];
    const lines = [
      `${game.date} 헤아리 "${game.chosung}"`,
    ];
    if (selectedHint) lines.push(selectedHint);
    lines.push(`${attempts}번의 헤아림${hintCount > 0 ? ` (도움 ${hintCount}회)` : ''}`);
    lines.push(window.location.origin);
    lines.push('');
    lines.push('#헤아리');
    return lines;
  };

  if (!game) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <>
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-12 animate-fade-in">
      <h1 className="mb-1 text-center text-3xl font-bold tracking-tight">헤아리</h1>
      <p className="mb-1 text-center text-sm text-zinc-500 dark:text-zinc-400">초성을 보고 단어를 맞춰보세요</p>
      <p className="mb-6 text-center text-xs text-zinc-400 dark:text-zinc-500">{game.date}</p>

      {!hintJamos ? (
        <div className="mb-6 text-center">
          <div className="text-7xl font-bold tracking-widest text-zinc-800 dark:text-zinc-200">
            {game.chosung.split('').map((c, i) => (
              <span key={i} className="chosung-char mx-1" style={{ animationDelay: `${i * 0.12}s` }}>{c}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-center">
          <div className="mx-auto flex flex-wrap justify-center gap-2">
            {hintJamos.map((jamo, i) => (
              <div
                key={i}
                className={`animate-pop-in flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xl font-bold transition-all duration-200 sm:h-14 sm:w-14 sm:text-2xl ${
                  hintRevealed![i]
                    ? 'border-zinc-300 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200'
                    : 'cursor-pointer border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
                }`}
                onClick={() => !hintRevealed![i] && revealJamo(i)}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {hintRevealed![i] ? jamo : '?'}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            ?를 눌러 힌트를 공개하세요 ({hintCount}회 사용)
          </p>
        </div>
      )}

      <div className="flex w-full gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 focus:border-zinc-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="정답 입력"
            disabled={solved || loading}
          />
          {dupMsg && (
            <p className="absolute -bottom-5 left-1 text-xs text-orange-500 animate-shake dark:text-orange-400">{dupMsg}</p>
          )}
        </div>
        <button
          className="rounded-lg border border-zinc-300 px-3 py-3 text-sm transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          onClick={fetchHint}
          disabled={solved || loading || !!hintJamos}
        >
          {!hintJamos ? '힌트' : `${hintCount}회 사용`}
        </button>
        <button
          className="rounded-lg bg-zinc-800 px-6 py-3 text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          onClick={submit}
          disabled={solved || loading || !input.trim()}
        >
          확인
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
          힌트 생성 중
          <span className="loading-dot ml-0.5">•</span>
          <span className="loading-dot">•</span>
          <span className="loading-dot">•</span>
        </p>
      )}

      {solved && (
        <div className="mt-6 animate-pop-in rounded-xl border border-green-200 bg-green-50 px-6 py-6 text-center dark:border-green-800 dark:bg-green-950">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">정답입니다!</p>
          <p className="mt-2 text-green-600 dark:text-green-400">{attempts}번 만에 맞추셨어요</p>
          <p className="mt-1 text-sm text-green-500 dark:text-green-500">
            {streak}일 연속 정답
            {longestStreak > streak && <span className="ml-2 text-green-400">최고 {longestStreak}일</span>}
          </p>
          <div className="mt-4">
            <textarea
              className="w-full resize-none rounded-lg border border-green-200 bg-white/50 p-3 text-xs text-zinc-600 dark:border-green-800 dark:bg-zinc-900/50 dark:text-zinc-400"
              value={shareLines().join('\n')}
              readOnly
              rows={5}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <Share2 className="mr-1 h-5 w-5 text-green-600 dark:text-green-400" />
            <button
              className="rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
              onClick={share}
              title="클립보드에 복사"
            >
              {copied ? <Check className="h-5 w-5" /> : <ClipboardCopy className="h-5 w-5" />}
            </button>
            <button
              className="rounded-lg bg-green-600 p-2 text-white transition-colors hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
              onClick={shareFedi}
              title="마스토돈/미스키로 공유"
            >
              <span className="flex items-center gap-1.5">
                <SiMastodon className="h-5 w-5" />
                <SiMisskey className="h-5 w-5" />
              </span>
            </button>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6 w-full space-y-2">
          {logs.map((entry, i) => (
            <div
              key={i}
              className={`log-enter rounded-lg border px-4 py-3 text-sm transition-colors ${
                entry.result.correct
                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                  : selectedHint !== null && 'hint' in entry.result && (entry.result as { hint: string }).hint === selectedHint
                  ? 'cursor-pointer border-green-300 bg-green-50/50 text-zinc-700 dark:border-green-600 dark:bg-green-950/50 dark:text-zinc-300'
                  : 'cursor-pointer border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/50'
              }`}
              onClick={() => entry.result.valid && 'hint' in entry.result && toggleHintSelection(i)}
            >
              <span className="mr-1 text-xs text-zinc-300 dark:text-zinc-600">{entry.attempt ?? (logs.length - i)}.</span>
            <span className="font-medium">{entry.input}</span>
              <span className="ml-2 text-zinc-400 dark:text-zinc-500">
                {entry.result.correct
                  ? '정답!'
                  : !entry.result.valid
                  ? '— ' + entry.result.reason
                  : '— ' + ('hint' in entry.result ? entry.result.hint : '')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>

    {showFediInput && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFediInput(false)}>
        <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800" onClick={e => e.stopPropagation()}>
          <p className="mb-3 text-sm font-medium">마스토돈/미스키 인스턴스 주소를 입력하세요</p>
          <div className="flex gap-2">
            <input
              ref={fediRef}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
              placeholder="mastodon.social"
              defaultValue={fediInstance}
              onKeyDown={e => e.key === 'Enter' && confirmFediInstance()}
            />
            <button
              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
              onClick={confirmFediInstance}
            >
              확인
            </button>
            <button
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              onClick={() => setShowFediInput(false)}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
