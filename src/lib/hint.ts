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
          content: `정답: '${answer}', 입력: '${input}'.
입력을 정답과 추상적으로 연결하는 한국어 한 문장(20자 내외)을 작성.
반드시 "'${input}'보다는 ..." 형식으로만 답변. ... 부분은 추상적 표현으로 채움. 따옴표나 괄호는 절대 사용하지 마.
정답 단어 직접 언급 금지.
매번 같은 패턴 반복하지 말고, 입력과 정답의 관계를 다양한 각도에서 은유적으로 표현.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 64,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${body}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content.trim();
}
