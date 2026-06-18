import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString } from '@/lib/game';

const CACHE_SWR = { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400, stale-if-error=86400' } };

export async function GET() {
  const { word, chosung } = await getDailyWord();
  return NextResponse.json({
    chosung,
    date: getTodayString(),
  }, CACHE_SWR);
}
