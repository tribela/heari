import { NextResponse } from 'next/server';
import { getDailyWord } from '@/lib/game';

export async function GET() {
  const { word, chosung } = await getDailyWord();
  return NextResponse.json({
    chosung,
    date: new Date().toISOString().slice(0, 10),
  });
}
