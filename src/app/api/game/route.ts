import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString } from '@/lib/game';
import { getWordForDate } from '@/lib/db';
import { sendPushToAll } from '@/lib/push';

const CACHE_SWR = { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400, stale-if-error=86400' } };

export async function GET() {
  const today = getTodayString();
  const existing = await getWordForDate(today);
  const { chosung } = await getDailyWord();

  if (!existing) {
    sendPushToAll(JSON.stringify({
      title: '헤아리',
      body: `오늘의 헤아리기: ${chosung}`,
      date: today,
      chosung,
    }));
  }

  return NextResponse.json({ chosung, date: today }, CACHE_SWR);
}
