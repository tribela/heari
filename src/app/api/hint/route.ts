import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString, decomposeWord } from '@/lib/game';

const CACHE_SWR = { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400, stale-if-error=86400' } };

export async function GET() {
  const { word } = await getDailyWord();
  const { jamos, initialRevealed } = decomposeWord(word);
  return NextResponse.json({ jamos, initialRevealed, date: getTodayString() }, CACHE_SWR);
}
