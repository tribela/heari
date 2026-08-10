import { NextRequest, NextResponse } from 'next/server';
import { getDailyWord, getTodayString, isChosungMatch, isValidInput, secondsUntilKstMidnight } from '@/lib/game';
import { getHint } from '@/lib/hint';

function cacheControl(): { headers: { 'Cache-Control': string } } {
  const maxAge = secondsUntilKstMidnight();
  return { headers: { 'Cache-Control': `public, s-maxage=${maxAge}, max-age=${maxAge}, must-revalidate` } };
}

export async function GET(req: NextRequest) {
  const cacheCtrl = cacheControl();
  const input = req.nextUrl.searchParams.get('input');
  if (!input) {
    return NextResponse.json({ error: '입력값이 없습니다' }, { status: 400 });
  }

  const trimmed = input.trim();
  const today = getTodayString();

  if (!isValidInput(trimmed)) {
    return NextResponse.json(
      { correct: false, valid: false, reason: '올바른 한글 단어를 입력하세요', date: today },
      cacheCtrl
    );
  }

  const { word: answer } = await getDailyWord();

  if (trimmed === answer) {
    return NextResponse.json({ correct: true, valid: true, date: today }, cacheCtrl);
  }

  if (!isChosungMatch(trimmed, answer)) {
    return NextResponse.json(
      { correct: false, valid: false, reason: '초성이 맞지 않습니다', date: today },
      cacheCtrl
    );
  }

  try {
    const hint = await getHint(trimmed, answer);
    return NextResponse.json({ correct: false, valid: true, hint, date: today }, cacheCtrl);
  } catch (e) {
    console.error('getHint error:', e);
    return NextResponse.json(
      { correct: false, valid: true, hint: `'${trimmed}'은 정답이 아닙니다`, date: today },
      cacheCtrl
    );
  }
}
