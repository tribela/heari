import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString } from '@/lib/game';
import { getWordForDate } from '@/lib/db';
import { sendPushToAll } from '@/lib/push';

const CACHE_CONTROL = { headers: { 'Cache-Control': 'public, max-age=300, must-revalidate' } };

export async function GET() {
  const today = getTodayString();
  const existing = await getWordForDate(today);
  const { chosung } = await getDailyWord();

  if (!existing) {
    await sendPushToAll(JSON.stringify({
      title: '헤아리',
      body: `오늘의 헤아리기: ${chosung}`,
      date: today,
      chosung,
    }));
  }

  return NextResponse.json({ chosung, date: today }, CACHE_CONTROL);
}
