import { NextRequest, NextResponse } from 'next/server';
import { getDailyWord, getTodayString, isChosungMatch, isValidInput } from '@/lib/game';
import { getHint } from '@/lib/hint';

const CACHE_CTRL = { headers: { 'Cache-Control': 'public, max-age=300, must-revalidate' } };

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input');
  if (!input) {
    return NextResponse.json({ error: '입력값이 없습니다' }, { status: 400 });
  }

  const trimmed = input.trim();
  const today = getTodayString();

  if (!isValidInput(trimmed)) {
    return NextResponse.json(
      { correct: false, valid: false, reason: '올바른 한글 단어를 입력하세요', date: today },
      CACHE_CTRL
    );
  }

  const { word: answer } = await getDailyWord();

  if (trimmed === answer) {
    return NextResponse.json({ correct: true, valid: true, date: today }, CACHE_CTRL);
  }

  if (!isChosungMatch(trimmed, answer)) {
    return NextResponse.json(
      { correct: false, valid: false, reason: '초성이 맞지 않습니다', date: today },
      CACHE_CTRL
    );
  }

  try {
    const hint = await getHint(trimmed, answer);
    return NextResponse.json({ correct: false, valid: true, hint, date: today }, CACHE_CTRL);
  } catch (e) {
    console.error('getHint error:', e);
    return NextResponse.json(
      { correct: false, valid: true, hint: `'${trimmed}'은 정답이 아닙니다`, date: today },
      CACHE_CTRL
    );
  }
}
