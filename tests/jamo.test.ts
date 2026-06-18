import { describe, it, expect } from 'bun:test';
import { decomposeWord } from '../src/lib/game';

describe('decomposeWord', () => {
  it('겹모음 분해 (ㅘ→ㅗ+ㅏ)', () => {
    const { jamos, initialRevealed } = decomposeWord('성과');
    expect(jamos.map((j, i) => initialRevealed[i] ? j : '?').join('')).toBe('ㅅ??ㄱ??');
  });

  it('겹받침 유지 (ㅄ, 3칸)', () => {
    const { jamos, initialRevealed } = decomposeWord('값');
    expect(jamos.map((j, i) => initialRevealed[i] ? j : '?').join('')).toBe('ㄱ??');
  });

  it('겹받침 유지 (ㄺ, 3칸)', () => {
    const { jamos, initialRevealed } = decomposeWord('닭');
    expect(jamos.map((j, i) => initialRevealed[i] ? j : '?').join('')).toBe('ㄷ??');
  });

  it('겹받침 유지 (ㄵ, 5칸)', () => {
    const { jamos, initialRevealed } = decomposeWord('앉다');
    expect(jamos.map((j, i) => initialRevealed[i] ? j : '?').join('')).toBe('ㅇ??ㄷ?');
  });

  it('겹모음+겹받침 혼합', () => {
    const { jamos, initialRevealed } = decomposeWord('괜찮아요');
    expect(jamos.map((j, i) => initialRevealed[i] ? j : '?').join('')).toBe('ㄱ???ㅊ??ㅇ?ㅇ?');
  });

  it('겹모음 ㅢ→ㅡ+ㅣ', () => {
    const { jamos, initialRevealed } = decomposeWord('희망');
    expect(jamos.map((j, i) => initialRevealed[i] ? j : '?').join('')).toBe('ㅎ??ㅁ??');
  });

  it('단일받침 ㅂ (비겹받침, 3칸)', () => {
    const { jamos, initialRevealed } = decomposeWord('밥');
    expect(jamos.map((j, i) => initialRevealed[i] ? j : '?').join('')).toBe('ㅂ??');
  });
});
