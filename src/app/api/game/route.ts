import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString } from '@/lib/game';

export async function GET() {
  const { word, chosung } = await getDailyWord();
  return NextResponse.json({
    chosung,
    date: getTodayString(),
  });
}
