import { getCachedHint, setCachedHint, cleanOldCache } from './db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';

export async function getHint(input: string, answer: string): Promise<string> {
  await cleanOldCache();

  const cached = await getCachedHint(input, answer);
  if (cached) return cached;

  const hint = await callOpenRouter(input, answer);
  await setCachedHint(input, answer, hint);
  return hint;
}

async function callOpenRouter(input: string, answer: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `당신은 '헤아리기' 게임의 힌트 생성 AI입니다.

[게임 규칙]
- 정답 단어: '${answer}'
- 사용자가 추측한 단어: '${input}'
- 두 단어는 초성이 동일합니다.

[힌트 생성 원칙]
1. 정답 단어를 절대 직접 언급하지 마세요.
2. 정답의 구체적 속성(색깔, 모양, 기능, 장소, 시간)을 직접 설명하지 마세요.
3. 대신, 정답이 불러일으키는 감정, 분위기, 추상적 관념, 철학적 느낌을 표현하세요.
4. 입력 단어를 출발점으로 삼아, 그 입력에서 정답으로 이어지는 미세한 감각의 흐름을 포착하세요.
5. '하늘', '색깔', '붉다', '시간' 같은 구체적 명사/형용사를 피하고, '여운', '경계', '머무름', '스침', '깊이' 같은 추상적/관념적 단어를 활용하세요.

[패턴 - 두 가지 중 선택]
A) "'${input}'보다는 [추상적 분위기/관념]에 가깝다"
B) "'${input}'처럼 [추상적 공통점/여운]이 있다"

[좋은 예시]
- "'누유'보다는 경계 위에 머무는 여운에 가깝다" (노을)
- "'수고'보다는 그의 결실에 가깝다" (사과)
- "'바람'보다는 불법적이다" (비리)
- "'빗물'처럼 낭만이 있다" (보물)
- "'넝마'처럼 슬픈 것이다" (눈물)

[출력 형식]
단 한 문장(15~25자 내외)만 출력하세요.
따옴표, 괄호, 물음표, 설명, 부연은 절대 금지입니다.`,
        },
      ],
      temperature: 0.95,
      max_tokens: 60,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${body}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content.trim();
}
