import fs from 'fs';
import path from 'path';
import { getWordForDate, setWordForDate } from './db';

const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ',
  'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ',
  'ㅌ', 'ㅍ', 'ㅎ',
];

export function extractChosung(word: string): string {
  let result = '';
  for (const ch of word) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code >= 0 && code < 11172) {
      result += CHOSUNG[Math.floor(code / 588)];
    }
  }
  return result;
}

export function getTodayString(): string {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function selectWord(words: string[], date: string): string {
  let hash = 0;
  for (const ch of date) {
    hash = ((hash << 5) - hash) + ch.charCodeAt(0);
    hash |= 0;
  }
  const idx = ((hash % words.length) + words.length) % words.length;
  return words[idx].trim();
}

let cachedWords: string[] | null = null;

function loadWords(): string[] {
  if (cachedWords) return cachedWords;
  const p = path.join(process.cwd(), 'words.txt');
  const content = fs.readFileSync(p, 'utf-8');
  cachedWords = content.split('\n').filter(w => w.trim().length > 0);
  return cachedWords;
}

export async function getDailyWord(date?: string): Promise<{ word: string; chosung: string }> {
  const today = date ?? getTodayString();

  const cached = await getWordForDate(today);
  if (cached) {
    return { word: cached, chosung: extractChosung(cached) };
  }

  const words = loadWords();
  const word = selectWord(words, today);
  await setWordForDate(today, word);
  return { word, chosung: extractChosung(word) };
}

export function isChosungMatch(input: string, answer: string): boolean {
  if (input.length !== answer.length) return false;
  return extractChosung(input) === extractChosung(answer);
}

export function isValidInput(input: string): boolean {
  if (input.length < 2) return false;
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return false;
  }
  return true;
}
