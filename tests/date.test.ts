import { describe, it, expect } from 'bun:test';
import { secondsUntilKstMidnight } from '@/lib/game';

// KST(UTC+9) 벽시계 → epoch ms
function kst(y: number, m: number, d: number, h: number, min: number, s: number): number {
  return Date.UTC(y, m - 1, d, h - 9, min, s);
}

describe('secondsUntilKstMidnight', () => {
  it('자정 직전 23:59:30 → 30초', () => {
    expect(secondsUntilKstMidnight(kst(2026, 8, 11, 23, 59, 30))).toBe(30);
  });

  it('아침 08:11 → 15시간 49분 (56940초)', () => {
    expect(secondsUntilKstMidnight(kst(2026, 8, 11, 8, 11, 0))).toBe(15 * 3600 + 49 * 60);
  });

  it('자정 정각 00:00:00 → 86400초 (다음 자정)', () => {
    expect(secondsUntilKstMidnight(kst(2026, 8, 11, 0, 0, 0))).toBe(86400);
  });

  it('월말 경계 8/31 23:00 → 3600초 (9/1 자정)', () => {
    expect(secondsUntilKstMidnight(kst(2026, 8, 31, 23, 0, 0))).toBe(3600);
  });

  it('연말 경계 12/31 23:30 → 1800초 (1/1 자정)', () => {
    expect(secondsUntilKstMidnight(kst(2026, 12, 31, 23, 30, 0))).toBe(1800);
  });
});
