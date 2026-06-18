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

const JUNGSUNG_JAMO = [
  'ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ',
];
const JONGSUNG_JAMO = [
  '','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
];

const JUNGSUNG_DECOMP: Record<number, [string, string]> = {
  9: ['ㅗ', 'ㅏ'],
  10: ['ㅗ', 'ㅐ'],
  11: ['ㅗ', 'ㅣ'],
  15: ['ㅜ', 'ㅓ'],
  16: ['ㅜ', 'ㅔ'],
  17: ['ㅜ', 'ㅣ'],
  19: ['ㅡ', 'ㅣ'],
};

const JONGSUNG_DECOMP: Record<number, [string, string]> = {};

export function decomposeWord(word: string): { jamos: string[]; initialRevealed: boolean[] } {
  const jamos: string[] = [];
  const initialRevealed: boolean[] = [];

  for (const ch of word) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code >= 11172) continue;

    const lIdx = Math.floor(code / 588);
    const vIdx = Math.floor((code % 588) / 28);
    const tIdx = code % 28;

    jamos.push(CHOSUNG[lIdx]);
    initialRevealed.push(true);

    const vDecomp = JUNGSUNG_DECOMP[vIdx];
    if (vDecomp) {
      jamos.push(...vDecomp);
      initialRevealed.push(false, false);
    } else {
      jamos.push(JUNGSUNG_JAMO[vIdx]);
      initialRevealed.push(false);
    }

    if (tIdx > 0) {
      const tDecomp = JONGSUNG_DECOMP[tIdx];
      if (tDecomp) {
        jamos.push(...tDecomp);
        initialRevealed.push(false, false);
      } else {
        jamos.push(JONGSUNG_JAMO[tIdx]);
        initialRevealed.push(false);
      }
    }
  }

  return { jamos, initialRevealed };
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
  const [y, m, d] = date.split('-').map(Number);
  const ts = (Date.UTC(y, m - 1, d, 0, 0, 0) - 9 * 3600 * 1000) / 1000;
  let hash = 0;
  const rev = String(ts).split('').reverse();
  for (const ch of rev) {
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
