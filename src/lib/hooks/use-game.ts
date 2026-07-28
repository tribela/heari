'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameData, GuessResult, LogEntry } from '@/lib/game-types';

const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ',
  'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ',
  'ㅌ', 'ㅍ', 'ㅎ',
];

function extractChosung(word: string): string {
  let r = '';
  for (const ch of word) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code >= 0 && code < 11172) r += CHOSUNG[Math.floor(code / 588)];
  }
  return r;
}

export function useGame() {
  const [game, setGame] = useState<GameData | null>(null);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dupMsg, setDupMsg] = useState('');
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [hintJamos, setHintJamos] = useState<string[] | null>(null);
  const [hintRevealed, setHintRevealed] = useState<boolean[] | null>(null);
  const [initialJamoRevealed, setInitialJamoRevealed] = useState<boolean[] | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [selectedHint, setSelectedHint] = useState<string | null>(null);
  const [notifKey, setNotifKey] = useState(0);
  const justSolved = useRef(false);
  const gameRef = useRef<GameData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = !solved && !loading;

  useEffect(() => {
    const s = localStorage.getItem('heari_streak');
    if (s) {
      try {
        const { current, longest } = JSON.parse(s);
        setStreak(current ?? 0);
        setLongestStreak(longest ?? 0);
      } catch { /* ignore */ }
    }

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
                if (state.initialJamoRevealed) setInitialJamoRevealed(state.initialJamoRevealed);
                else if (state.hintRevealed) setInitialJamoRevealed([...state.hintRevealed]);
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
  }, []);

  // ── 상태 영속화 ──

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
      initialJamoRevealed,
      hintCount,
    }));
  }, [game, attempts, solved, logs, hintJamos, hintRevealed, initialJamoRevealed, hintCount]);

  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [solved, loading]);

  useEffect(() => {
    if (!solved || !justSolved.current) return;
    justSolved.current = false;
    if (typeof Notification === 'undefined') return;
    if (localStorage.getItem('notifications_enabled') !== null) return;

    Notification.requestPermission().then((result) => {
      const enabled = result === 'granted';
      localStorage.setItem('notifications_enabled', String(enabled));
      navigator.serviceWorker.controller?.postMessage({ type: 'set-notifications', enabled });
      setNotifKey((k) => k + 1);
    });
  }, [solved]);

  const resetGame = useCallback(() => {
    setDupMsg('새로운 날의 문제가 시작되었습니다!');
    setAttempts(0);
    setSolved(false);
    setLogs([]);
    setInput('');
    setHintJamos(null);
    setHintRevealed(null);
    setInitialJamoRevealed(null);
    setHintCount(0);
    setSelectedHint(null);
    localStorage.removeItem('heari_state');
    fetch('/api/game').then(r => r.json()).then(d => setGame(d));
    setTimeout(() => setDupMsg(''), 3000);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'new-game') {
        if (gameRef.current && event.data.date === gameRef.current.date) return;
        resetGame();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [resetGame]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible' || !gameRef.current) return;
      const now = Date.now();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstNow = now + kstOffset;
      const kstDate = new Date(kstNow).toISOString().slice(0, 10);
      if (kstDate === gameRef.current.date) return;
      fetch('/api/game').then(r => r.json()).then((data: GameData) => {
        if (data.date !== gameRef.current?.date) {
          resetGame();
        }
      });
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [resetGame]);

  const submitGuess = useCallback(async () => {
    const val = input.trim();
    if (!val || !isActive || !game) return;

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
      const res = await fetch('/api/guess?input=' + encodeURIComponent(val));

      if (res.status === 429) {
        setDupMsg('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false);
        setInput('');
        return;
      }

      const data: GuessResult = await res.json();

      if (data.date !== gameRef.current?.date) {
        resetGame();
        setLoading(false);
        return;
      }

      if (data.correct) {
        justSolved.current = true;
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
  }, [input, loading, solved, game, attempts, logs, resetGame]);

  const openHint = useCallback(async () => {
    if (!game || !isActive) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hint');
      if (res.status === 429) {
        setDupMsg('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.date !== gameRef.current?.date) {
        resetGame();
        setLoading(false);
        return;
      }
      const newAttempt = attempts + 1;
      setHintJamos(data.jamos);
      setHintRevealed(data.initialRevealed);
      setInitialJamoRevealed(data.initialRevealed);
      setAttempts(a => a + 1);
      setHintCount(c => c + 1);
      setLogs(l => [{
        input: '💡 힌트 열기',
        result: { correct: false, valid: true, hint: '', date: game.date },
        attempt: newAttempt,
        jamoState: { jamos: data.jamos, revealed: data.initialRevealed },
      }, ...l]);
    } catch { /* ignore */ }
    setLoading(false);
  }, [game, solved, loading, attempts, resetGame]);

  const revealJamo = useCallback((index: number) => {
    if (!hintRevealed || hintRevealed[index] || !isActive) return;
    const newAttempt = attempts + 1;
    const newRevealed = [...hintRevealed];
    newRevealed[index] = true;
    setHintRevealed(prev => {
      const next = [...prev!];
      next[index] = true;
      return next;
    });
    setAttempts(a => a + 1);
    setHintCount(c => c + 1);
    setLogs(l => [{
      input: '🔍 자모 공개',
      result: { correct: false, valid: true, hint: '', date: game!.date },
      attempt: newAttempt,
      jamoState: { jamos: hintJamos!, revealed: newRevealed, newIndex: index },
    }, ...l]);
  }, [hintRevealed, loading, attempts, game, hintJamos]);

  const toggleHintSelection = useCallback((index: number) => {
    if (!solved) return;
    const entry = logs[index];
    if (!entry.result.valid || !('hint' in entry.result)) return;
    const hint = (entry.result as { hint: string }).hint;
    setSelectedHint(prev => prev === hint ? null : hint);
  }, [logs, solved]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitGuess();
  };

  return {
    game, input, setInput, inputRef,
    attempts, solved, logs, loading, dupMsg, isActive,
    hintJamos, hintRevealed, initialJamoRevealed, hintCount, selectedHint,
    streak, longestStreak, notifKey,
    justSolved,
    submitGuess, openHint, revealJamo, toggleHintSelection,
    handleKeyDown, resetGame, setLoading, setDupMsg,
  };
}
