import { NextRequest, NextResponse } from 'next/server';
import { getDailyWord, isChosungMatch, isValidInput } from '@/lib/game';
import { getHint } from '@/lib/hint';

export async function POST(req: NextRequest) {
  const { input } = await req.json() as { input: string };
  if (!input || typeof input !== 'string') {
    return NextResponse.json({ error: '입력값이 없습니다' }, { status: 400 });
  }

  const trimmed = input.trim();

  if (!isValidInput(trimmed)) {
    return NextResponse.json(
      { correct: false, valid: false, reason: '2-3글자의 한글 단어를 입력하세요' }
    );
  }

  const { word: answer } = await getDailyWord();

  if (trimmed === answer) {
    return NextResponse.json({ correct: true, valid: true });
  }

  if (!isChosungMatch(trimmed, answer)) {
    return NextResponse.json(
      { correct: false, valid: false, reason: '초성이 맞지 않습니다' }
    );
  }

  try {
    const hint = await getHint(trimmed, answer);
    return NextResponse.json({ correct: false, valid: true, hint });
  } catch (e) {
    console.error('getHint error:', e);
    return NextResponse.json(
      { correct: false, valid: true, hint: `'${trimmed}'은 정답이 아닙니다` }
    );
  }
}
