'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type GameData = {
  chosung: string;
  date: string;
};

type GuessResult =
  | { correct: true; valid: true }
  | { correct: false; valid: false; reason: string }
  | { correct: false; valid: true; hint: string };

type LogEntry = {
  input: string;
  result: GuessResult;
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
  const inputRef = useRef<HTMLInputElement>(null);

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
              if (state.date === data.date) {
                setAttempts(state.attempts ?? 0);
                setSolved(state.solved ?? false);
                setLogs(state.logs ?? []);
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
  }, []);

  useEffect(() => {
    if (!game) return;
    localStorage.setItem('heari_state', JSON.stringify({
      date: game.date,
      attempts,
      solved,
      logs,
    }));
  }, [game, attempts, solved, logs]);

  useEffect(() => {
    if (!solved && !loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [solved, loading]);

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

      if (data.valid) {
        setAttempts(prevAttempts + 1);
      }
      if (data.correct) {
        setSolved(true);
      }
      setLogs(l => [{ input: val, result: data }, ...l]);
    } catch { /* ignore */ }
    setLoading(false);
    setInput('');
  }, [input, loading, solved, game, attempts, logs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const share = async () => {
    if (!game) return;
    const lastHint = logs.find(e => !e.result.correct && e.result.valid && 'hint' in e.result)?.result as { hint: string } | undefined;
    const lines = [
      `${game.date} 헤아리 "${game.chosung}"`,
    ];
    if (lastHint) lines.push(lastHint.hint);
    lines.push(`${attempts}번의 헤아림`);
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (!game) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-12">
      <h1 className="mb-1 text-center text-3xl font-bold tracking-tight">헤아리</h1>
      <p className="mb-6 text-center text-sm text-zinc-500">초성을 보고 단어를 맞춰보세요</p>

      <div className="mb-6 text-center">
        <div className="text-7xl font-bold tracking-widest text-zinc-800">
          {game.chosung.split('').map((c, i) => (
            <span key={i} className="mx-1">{c}</span>
          ))}
        </div>
      </div>

      <div className="flex w-full gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none disabled:opacity-50"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="정답 입력"
            maxLength={3}
            disabled={solved || loading}
          />
          {dupMsg && (
            <p className="absolute -bottom-5 left-1 text-xs text-orange-500">{dupMsg}</p>
          )}
        </div>
        <button
          className="rounded-lg bg-zinc-800 px-6 py-3 text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          onClick={submit}
          disabled={solved || loading || !input.trim()}
        >
          확인
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-center text-sm text-zinc-400">힌트 생성 중...</p>
      )}

      {solved && (
        <div className="mt-6 rounded-xl bg-green-50 px-6 py-6 text-center">
          <p className="text-2xl font-bold text-green-700">정답입니다!</p>
          <p className="mt-2 text-green-600">{attempts}번 만에 맞추셨어요</p>
          <button
            className="mt-4 rounded-lg bg-green-600 px-5 py-2 text-sm text-white transition-colors hover:bg-green-500"
            onClick={share}
          >
            {copied ? '복사됨!' : '공유하기'}
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6 w-full space-y-2">
          {logs.map((entry, i) => (
            <div
              key={i}
              className={`rounded-lg border px-4 py-3 text-sm ${
                entry.result.correct
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-zinc-200 bg-white text-zinc-700'
              }`}
            >
              <span className="font-medium">{entry.input}</span>
              <span className="ml-2 text-zinc-400">
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
  );
}
