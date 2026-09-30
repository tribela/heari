// 힌트 모델 실측 스크립트. 빌드와 무관한 수동 실행 전용이다.
//   bun run test:hint-models -- --list-models   # 체인 확인 (API 호출 없음)
//   bun run test:hint-models                    # data/hint-test-YYYYMMDD-HHmm.csv 생성
//   bun run test:hint-models -- --out path.csv  # 출력 경로 지정
// 캐시를 읽지도 쓰지도 않는다. 결과 CSV는 gitignored(data/)가 기본값이다.
import { generateHintForModel, HINT_MODELS } from '../src/lib/hint';
import { extractChosung } from '../src/lib/game';
import fs from 'node:fs';
import path from 'node:path';

const PAIRS: [answer: string, input: string][] = [
  ['나라', '나름'],
  ['사랑', '사람'],
  ['바다', '보도'],
  ['학교', '한강'],
  ['기차', '고추'],
  ['책상', '추석'],
  ['마음', '모임'],
];

function esc(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function flag(hint: string, answer: string): string {
  return [
    hint.includes(answer) ? 'LEAK' : 'ok',
    hint.includes('[이미 생성된 힌트들]') || hint.includes('\n') ? 'ECHO' : 'single-line',
    `${hint.length}자`,
  ].join('/');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--list-models')) {
    console.log(HINT_MODELS.join('\n'));
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY이 없습니다. .env를 확인하세요.');
    process.exit(1);
  }

  const outFlag = args.indexOf('--out');
  const out =
    outFlag >= 0 && args[outFlag + 1]
      ? args[outFlag + 1]
      : path.join(
          process.cwd(),
          'data',
          `hint-test-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.csv`
        );

  console.log('models:', HINT_MODELS.join(' | '));
  const rows: string[] = ['정답,입력,힌트,모델,응답시간ms'];
  for (const [answer, input] of PAIRS) {
    if (extractChosung(input) !== extractChosung(answer) || input.length !== answer.length) {
      console.error(`SKIP 초성 불일치: ${answer} ${input}`);
      continue;
    }
    for (const model of HINT_MODELS) {
      const started = Date.now();
      try {
        const { hint, provider } = await generateHintForModel(model, input, answer);
        const ms = Date.now() - started;
        const label = `${model} (${provider})`;
        console.log(`${flag(hint, answer)} [${label}] ${ms}ms ${answer}/${input} -> ${hint.slice(0, 80)}`);
        rows.push([answer, input, hint, label, String(ms)].map(esc).join(','));
      } catch (e) {
        const ms = Date.now() - started;
        console.error(`ERROR [${model}] ${ms}ms ${answer}/${input}:`, e);
        rows.push([answer, input, `ERROR:${e}`, model, String(ms)].map(esc).join(','));
      }
    }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, '﻿' + rows.join('\n') + '\n');
  console.log(`wrote ${out} (${rows.length - 1} rows)`);
}

if (import.meta.main) {
  void main();
}
