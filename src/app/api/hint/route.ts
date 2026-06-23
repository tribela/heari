import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString, decomposeWord } from '@/lib/game';

const CACHE_CTRL = { headers: { 'Cache-Control': 'public, max-age=300, must-revalidate' } };

export async function GET() {
  const { word } = await getDailyWord();
  const { jamos, initialRevealed } = decomposeWord(word);
  return NextResponse.json({ jamos, initialRevealed, date: getTodayString() }, CACHE_CTRL);
}
