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

  it('ㅟ→ㅜ+ㅣ (위)', () => {
    const { jamos } = decomposeWord('위');
    expect(jamos).toEqual(['ㅇ', 'ㅜ', 'ㅣ']);
  });

  it('ㅝ→ㅜ+ㅓ (워)', () => {
    const { jamos } = decomposeWord('워');
    expect(jamos).toEqual(['ㅇ', 'ㅜ', 'ㅓ']);
  });

  it('ㅞ→ㅜ+ㅔ (웨)', () => {
    const { jamos } = decomposeWord('웨');
    expect(jamos).toEqual(['ㅇ', 'ㅜ', 'ㅔ']);
  });

  it('위성 올바른 자모 분해', () => {
    const { jamos } = decomposeWord('위성');
    expect(jamos).toEqual(['ㅇ', 'ㅜ', 'ㅣ', 'ㅅ', 'ㅓ', 'ㅇ']);
  });

  it('ㅠ는 단일모음 유지 (분해하지 않음)', () => {
    const { jamos } = decomposeWord('유');
    expect(jamos).toEqual(['ㅇ', 'ㅠ']);
  });

  it('ㅙ→ㅗ+ㅐ (왜)', () => {
    const { jamos } = decomposeWord('왜');
    expect(jamos).toEqual(['ㅇ', 'ㅗ', 'ㅐ']);
  });

  it('ㅚ→ㅗ+ㅣ (외)', () => {
    const { jamos } = decomposeWord('외');
    expect(jamos).toEqual(['ㅇ', 'ㅗ', 'ㅣ']);
  });

  it('겹모음+받침 (원)', () => {
    const { jamos } = decomposeWord('원');
    expect(jamos).toEqual(['ㅇ', 'ㅜ', 'ㅓ', 'ㄴ']);
  });

  it('겹모음+받침 (쉰)', () => {
    const { jamos } = decomposeWord('쉰');
    expect(jamos).toEqual(['ㅅ', 'ㅜ', 'ㅣ', 'ㄴ']);
  });

  it('겹모음+겹받침 혼합 (꽹)', () => {
    const { jamos } = decomposeWord('꽹');
    expect(jamos).toEqual(['ㄲ', 'ㅗ', 'ㅐ', 'ㅇ']);
  });

  // 겹모음 경계 인접 단일모음이 분해되지 않는지 확인
  it('단일모음 ㅗ 유지 (vIdx=8, 겹모음 경계)', () => {
    const { jamos } = decomposeWord('고');
    expect(jamos).toEqual(['ㄱ', 'ㅗ']);
  });

  it('단일모음 ㅛ 유지 (vIdx=12, 겹모음 경계)', () => {
    const { jamos } = decomposeWord('요');
    expect(jamos).toEqual(['ㅇ', 'ㅛ']);
  });

  it('단일모음 ㅡ 유지 (vIdx=18, 겹모음 경계)', () => {
    const { jamos } = decomposeWord('그');
    expect(jamos).toEqual(['ㄱ', 'ㅡ']);
  });

  it('단일모음 ㅣ 유지 (vIdx=20, 겹모음 경계)', () => {
    const { jamos } = decomposeWord('기');
    expect(jamos).toEqual(['ㄱ', 'ㅣ']);
  });

  // 초성 다양성
  it('쌍자음 초성 ㄲ', () => {
    const { jamos } = decomposeWord('까');
    expect(jamos).toEqual(['ㄲ', 'ㅏ']);
  });

  it('쌍자음 초성 ㅃ', () => {
    const { jamos } = decomposeWord('뿌');
    expect(jamos).toEqual(['ㅃ', 'ㅜ']);
  });

  // 모든 종성(받침) 인덱스
  it('종성 ㄱ (각)', () => {
    const { jamos } = decomposeWord('각');
    expect(jamos).toEqual(['ㄱ', 'ㅏ', 'ㄱ']);
  });

  it('종성 ㄶ (많)', () => {
    const { jamos } = decomposeWord('많');
    expect(jamos).toEqual(['ㅁ', 'ㅏ', 'ㄶ']);
  });

  it('종성 ㅀ (끓)', () => {
    const { jamos } = decomposeWord('끓');
    expect(jamos).toEqual(['ㄲ', 'ㅡ', 'ㅀ']);
  });

  it('종성 ㅆ (있)', () => {
    const { jamos } = decomposeWord('있');
    expect(jamos).toEqual(['ㅇ', 'ㅣ', 'ㅆ']);
  });

  // 엣지 케이스
  it('빈 문자열', () => {
    const { jamos, initialRevealed } = decomposeWord('');
    expect(jamos).toEqual([]);
    expect(initialRevealed).toEqual([]);
  });

  it('한글 외 문자 무시', () => {
    const { jamos, initialRevealed } = decomposeWord('a1가.');
    expect(jamos).toEqual(['ㄱ', 'ㅏ']);
    expect(initialRevealed).toEqual([true, false]);
  });

  it('여러 글자 정확한 initialRevealed', () => {
    const { jamos, initialRevealed } = decomposeWord('위성');
    expect(jamos).toEqual(['ㅇ', 'ㅜ', 'ㅣ', 'ㅅ', 'ㅓ', 'ㅇ']);
    expect(initialRevealed).toEqual([true, false, false, true, false, false]);
  });
});
