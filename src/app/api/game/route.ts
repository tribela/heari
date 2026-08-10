import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString, secondsUntilKstMidnight } from '@/lib/game';
import { getWordForDate } from '@/lib/db';
import { sendPushToAll } from '@/lib/push';

function cacheControl(): { headers: { 'Cache-Control': string } } {
  const maxAge = secondsUntilKstMidnight();
  return { headers: { 'Cache-Control': `public, s-maxage=${maxAge}, max-age=${maxAge}, must-revalidate` } };
}

export async function GET() {
  const today = getTodayString();
  const existing = await getWordForDate(today);
  const { chosung } = await getDailyWord();

  if (!existing) {
    // 푸시는 응답과 무관하므로 백그라운드로 전송 (await 하면 하루 첫 요청이 느린 엔드포인트에 블로킹됨)
    void sendPushToAll(JSON.stringify({
      title: '헤아리',
      body: `오늘의 헤아리기: ${chosung}`,
      date: today,
      chosung,
    })).catch((e) => console.error('sendPushToAll failed:', e));
  }

  return NextResponse.json({ chosung, date: today }, cacheControl());
}
