import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString, decomposeWord, secondsUntilKstMidnight } from '@/lib/game';

function cacheControl(): { headers: { 'Cache-Control': string } } {
  const maxAge = secondsUntilKstMidnight();
  return { headers: { 'Cache-Control': `public, s-maxage=${maxAge}, max-age=${maxAge}, must-revalidate` } };
}

export async function GET() {
  const { word } = await getDailyWord();
  const { jamos, initialRevealed } = decomposeWord(word);
  return NextResponse.json({ jamos, initialRevealed, date: getTodayString() }, cacheControl());
}
