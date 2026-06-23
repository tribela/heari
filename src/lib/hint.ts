import { getCachedHint, setCachedHint, cleanOldCache } from './db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
const MAX_RETRIES = 3;

function stripQuotes(s: string): string {
  const quotes = ['"', "'", '「', '」', '『', '』'];
  for (const q of quotes) {
    if (s.startsWith(q) && s.endsWith(q)) {
      return s.slice(q.length, -q.length).trim();
    }
  }
  return s;
}

function containsAnswer(hint: string, answer: string): boolean {
  return answer.length > 0 && hint.includes(answer);
}

export async function getHint(input: string, answer: string): Promise<string> {
  await cleanOldCache();

  const cached = await getCachedHint(input, answer);
  if (cached) return cached;

  let hint = await callOpenRouter(input, answer);
  hint = stripQuotes(hint);

  for (let i = 0; i < MAX_RETRIES && containsAnswer(hint, answer); i++) {
    hint = await callOpenRouter(input, answer);
    hint = stripQuotes(hint);
  }

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
4. 입력 단어를 출발점으로 삼아, 그 입력에서 정답으로 이어지는 연상적 연결고리를 만들어 주세요.
5. 한 번의 힌트만으로 너무 많은 것을 유추할 수 있게는 하지 마세요.

[패턴 (참고용)]
- "'[입력]'보다는 [추상적 분위기]에 가깝다"
- "'[입력]'처럼 [추상적 공통점]이 있다"
- "'[입력]'{보다는/보다도/보다} [정답과의 관계]이다"
- "'[입력]'{과/와} {전혀 관련이 없다/관련이 있다}"

[좋은 예시]
- "'누유'보다는 아름답다" (노을)
- "'수고'보다는 그의 결실에 가깝다" (사과)
- "'바람'보다는 불법적이다" (비리)
- "'빗물'처럼 낭만이 있다" (보물)
- "'가을'에 볼 수 있다" (낙엽)
- "'아이'를 많이 볼 수 있는 곳이다" (유치원)
- "'유치원'처럼 어떤 장소이다" (학교)
- "'환자'보다는 건강하다" (축구선수)
- "'자동차'와는 전혀 관련이 없다" (딸기우유)
- "'인질'과 관련이 있다" (협상)

[나쁜 예시]
- "'부모'처럼 의존적인 순간이 있다" (병원 / 정답과 너무 동떨어짐)
- "'주시'보다는 그리움이 남는다" (제시 / 정답과 동떨어짐)
- "'체력'보다는 아픔의 손길이 있다" (병원 / 정답을 너무 바로 알 수 있음)
- "'낙엽'을 쓸어 담을 수 있다" (빗자루 / 정답을 너무 바로 알 수 있음)

[출력 형식]
당신의 생각은 내부적으로 하고, 최종 출력은 단 한 문장(15~25자 내외)만 출력하세요.
따옴표, 괄호, 물음표, 설명, 부연은 절대 금지입니다.`,
        },
      ],
      temperature: 0.95,
      max_tokens: 200,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`OpenRouter API error: ${res.status}`, body);
    throw new Error(`OpenRouter API error: ${res.status}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content.trim();
}
