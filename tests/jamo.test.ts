import { decomposeWord } from '../src/lib/game';

type Case = { word: string; want: string; desc: string };

const cases: Case[] = [
  { word: '성과', want: 'ㅅ??ㄱ??', desc: '겹모음 분해 (ㅘ→ㅗ+ㅏ)' },
  { word: '값',   want: 'ㄱ??',    desc: '겹받침 유지 (ㅄ, 3칸)' },
  { word: '닭',   want: 'ㄷ??',    desc: '겹받침 유지 (ㄺ, 3칸)' },
  { word: '앉다', want: 'ㅇ??ㄷ?', desc: '겹받침 유지 (ㄵ, 5칸)' },
  { word: '괜찮아요', want: 'ㄱ???ㅊ??ㅇ?ㅇ?', desc: '겹모음+겹받침 혼합' },
  { word: '희망', want: 'ㅎ??ㅁ??', desc: '겹모음 ㅢ→ㅡ+ㅣ' },
  { word: '밥',   want: 'ㅂ??',   desc: '단일받침 ㅂ (비겹받침, 3칸)' },
];

let failed = 0;
for (const { word, want, desc } of cases) {
  const { jamos, initialRevealed } = decomposeWord(word);
  const got = jamos.map((j, i) => initialRevealed[i] ? j : '?').join('');
  const ok = got === want;
  console.log(ok ? '✓' : '✗', `${word.padEnd(6)} → ${got}${ok ? '' : ` (want ${want})`}  // ${desc}`);
  if (!ok) failed++;
}
console.log(`\n${failed ? `FAILED ${failed}/${cases.length}` : `PASS ${cases.length}/${cases.length}`}`);
process.exit(failed ? 1 : 0);
