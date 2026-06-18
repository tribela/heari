import { NextResponse } from 'next/server';
import { getDailyWord, getTodayString, decomposeWord } from '@/lib/game';

export async function GET() {
  const { word } = await getDailyWord();
  const { jamos, initialRevealed } = decomposeWord(word);
  return NextResponse.json({ jamos, initialRevealed, date: getTodayString() });
}
