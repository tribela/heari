import { getCachedHint, setCachedHint, cleanOldCache, getRecentHints } from './db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const MODELS = (process.env.OPENROUTER_MODELS ?? process.env.OPENROUTER_MODEL ?? 'openai/gpt-4.1-mini,deepseek/deepseek-chat')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
const LEAK_RETRIES_PER_MODEL = 1;
const MAX_TOKENS = 200;

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
  if (answer.length === 0) return false;
  if (hint.includes(answer)) return true;
  // 모델이 글자 사이에 공백/따옴표를 넣는 변형을 잡기 위한 정규화 검사
  const strip = (s: string) => s.replace(/[\s'"‘’“”「」『』()?.!,~\-·]/g, '');
  const normalizedAnswer = strip(answer);
  if (normalizedAnswer.length > 0 && strip(hint).includes(normalizedAnswer)) return true;
  return false;
}

function fallbackHint(input: string): string {
  return `'${input}'은 정답이 아닙니다`;
}

function isBrokenFormat(hint: string): boolean {
  return hint.includes('[이미 생성된 힌트들]') || hint.includes('\n');
}

function isUnusableHint(hint: string, answer: string): boolean {
  return containsAnswer(hint, answer) || isBrokenFormat(hint);
}

export async function getHint(input: string, answer: string): Promise<string> {
  return (await getHintWithMeta(input, answer)).hint;
}

export async function getHintWithMeta(
  input: string,
  answer: string
): Promise<{ hint: string; model: string }> {
  await cleanOldCache();

  const cached = await getCachedHint(input, answer);
  // 캐시에 유출 힌트가 저장되어 있을 수 있으므로 검증 후 반환
  if (cached && !containsAnswer(cached, answer)) return { hint: cached, model: 'cache' };

  const existingHints = (await getRecentHints(answer)).filter(
    (h) => !isUnusableHint(h.hint, answer)
  );

  for (const model of MODELS) {
    try {
      let hint = stripQuotes((await callOpenRouter(model, input, answer, existingHints)).text);
      for (let i = 0; i < LEAK_RETRIES_PER_MODEL && isUnusableHint(hint, answer); i++) {
        hint = stripQuotes((await callOpenRouter(model, input, answer, existingHints)).text);
      }
      if (!isUnusableHint(hint, answer)) {
        await setCachedHint(input, answer, hint);
        return { hint, model };
      }
      console.error(`Hint rejected from model ${model}, trying next model: ${hint.slice(0, 60)}`);
    } catch (e) {
      console.error(`Hint model ${model} failed, trying next model:`, e);
    }
  }

  const fallback = fallbackHint(input);
  await setCachedHint(input, answer, fallback);
  return { hint: fallback, model: 'fallback' };
}

export const HINT_MODELS: string[] = MODELS;

export async function generateHintForModel(
  model: string,
  input: string,
  answer: string
): Promise<{ hint: string; provider: string }> {
  const existingHints = (await getRecentHints(answer)).filter(
    (h) => !isUnusableHint(h.hint, answer)
  );
  const { text, provider } = await callOpenRouter(model, input, answer, existingHints);
  return { hint: stripQuotes(text), provider };
}

async function callOpenRouter(
  model: string,
  input: string,
  answer: string,
  existingHints: { input: string; hint: string }[] = []
): Promise<{ text: string; provider: string }> {
  let referenceMessage: { role: string; content: string } | null = null;
  if (existingHints.length > 0) {
    referenceMessage = {
      role: 'user',
      content: [
        '[이미 생성된 힌트들 — 중복 방지용 참고 목록]',
        ...existingHints.map((h) => `- '${h.input}': "${h.hint}"`),
        '',
        '위 목록은 참고용입니다. 목록의 어떤 문장도 출력·복사·인용하지 마세요.',
        '목록과 핵심 명사·형용사·동사가 겹치지 않는 새로운 힌트 한 문장을 출력하세요.',
      ].join('\n'),
    };
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `당신은 '헤아리기' 게임의 힌트 생성 AI입니다.
[게임 규칙]
- 정답 단어: '${answer}'
- 사용자가 추측한 단어: '${input}'
- 두 단어는 초성이 동일합니다.

[힌트 생성 원칙]
1. 정답 단어('${answer}')를 출력문에 어떤 형태로도 포함하지 마세요. 정답 문자열이 그대로 들어가는 것은 물론, 정답을 작은따옴표·괄호로 감싸서 언급하는 것도 금지입니다. 출력문에 '${answer}'가 포함되면 그 힌트는 실패작입니다.
2. 정답의 구체적 속성(색깔, 모양, 기능, 장소, 시간)을 직접 설명하지 마세요.
3. 대신, 정답이 불러일으키는 감정, 분위기, 추상적 관념, 철학적 느낌을 표현하세요.
4. 힌트 문장에 반드시 입력 단어('${input}')를 작은따옴표로 감싸서 포함하세요. 입력 단어를 언급하지 않은 힌트는 무효입니다.
5. 작은따옴표는 입력 단어('${input}')를 감쌀 때 딱 한 번만 사용하세요. 정답이나 다른 단어를 따옴표로 감싸지 마세요.
6. 입력 단어와 정답 사이에 진짜 연관성이 느껴져야 합니다. 입력 단어에 대한 설명으로 끝나면 안 되고, 힌트를 읽었을 때 정답('${answer}')이 연상되어야 합니다. 입력은 출발점일 뿐, 초점은 항상 정답에 맞춰져야 합니다. 단, 연상되게 할 뿐 정답 문자열을 쓰지는 마세요.
7. 한 번의 힌트만으로 너무 많은 것을 유추할 수 있게는 하지 마세요.
8. 사용자 메시지로 전달된 [이미 생성된 힌트들]이 있다면 그 목록과 모든 면에서 달라야 합니다. 특히 핵심 명사/형용사/동사의 반복을 엄격히 금지합니다. 목록의 어떤 문장도 출력·복사·인용하지 마세요.

[다양한 표현 패턴 (참고용. 훨씬 더 다양하게 변형하세요)]
- "'[입력]'보다는 [분위기]다"
- "'[입력]'처럼 [공통점]이 있다"
- "'[입력]'과/와 관련이 있다/없다"
- "'[입력]'에서 연상되는 [분위기]다"
- "'[입력]'에 비해 [특징]이 두드러진다"

[좋은 예시]
- "'가을'에 볼 수 있다" (낙엽) — 계절과 현상의 자연스러운 연결
- "'자동차'와는 전혀 관련이 없다" (딸기우유) — 명확한 부정으로 오히려 방향 제시
- "'시험'에서 마주하는 기분이다" (면접) — 비슷한 맥락의 연상
- "'여행'이 주는 설렘과 같다" (첫사랑) — 감정 이입이 자연스러움
- "'덥다'보다는 포근함이 느껴진다" (이불) — 온도감을 통한 자연스러운 대비

[나쁜 예시]
- "'부모'처럼 의존적인 순간이 있다" (병원 / 정답과 연결고리가 불분명)
- "'체력'보다는 아픔의 손길이 있다" (병원 / 정답을 너무 바로 특정함)
- "'감정', '느낌', '존재', '흔적', '소소한', '따뜻한' — 의미 없이 분위기만 띄우는 모호한 단어로 채우지 마세요"
- "'입력 단어 + 아무 추상적 수식어 + 이다' 패턴은 가장 나쁜 힌트입니다. 입력과 힌트 사이에 진짜 생각이 느껴져야 합니다."
- "'구걸'은 인간의 본능적인 관계 맺음과 연결될 수 있다" — 입력 단어만 설명할 뿐 정답이 전혀 연상되지 않음"

[출력 형식]
당신의 생각은 내부적으로 하고, 최종 출력은 단 한 문장(15~25자 내외)만 출력하세요.
반드시 작은따옴표로 감싼 입력 단어('${input}')를 문장에 포함해야 합니다.
입력 단어를 감싸는 작은따옴표 외에 다른 따옴표·괄호·물음표·설명·부연은 절대 금지입니다.`,
        },
        ...(referenceMessage ? [referenceMessage] : []),
      ],
      temperature: 0.95,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`OpenRouter API error: ${res.status}`, body);
    throw new Error(`OpenRouter API error: ${res.status}`);
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
    provider?: string;
  };
  return {
    text: data.choices[0].message.content.trim(),
    provider: data.provider ?? 'unknown',
  };
}
