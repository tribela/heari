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
          content: `정답 단어는 '${answer}'입니다. 사용자가 '${input}'을 입력했습니다.
반드시 "'${input}'보다는 ~하다" 형식으로만 답변하세요.
정답 단어를 직접 언급하지 마세요. 힌트는 한국어 한 문장으로 20자 이내로 작성하세요.`,
        },
        {
          role: 'user',
          content: `'${input}'에 대한 힌트를 줘.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${body}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content.trim();
}
