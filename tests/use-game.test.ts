import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGame } from '@/lib/hooks/use-game';

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({ json: () => Promise.resolve(data), status });
}

function createMockFetch() {
  const fn = mock((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    if (urlStr === '/api/game')
      return jsonResponse({ chosung: 'ㅅㄱ', date: '2026-07-30' });
    if (urlStr.startsWith('/api/guess?input='))
      return jsonResponse({ correct: false, valid: true, hint: 'hint', date: '2026-07-30' });
    if (urlStr.startsWith('/api/hint'))
      return jsonResponse({ jamos: ['ㅅ','ㅡ','ㄱ','ㅓ'], initialRevealed: [true,true,true,true], date: '2026-07-30' });
    return Promise.reject(new Error('Unknown URL: ' + urlStr));
  });
  return { fn };
}

describe('useGame attempts', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch();
    Object.defineProperty(globalThis, 'fetch', {
      value: mockFetch.fn,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'fetch', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('attempts=0 initially', async () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.attempts).toBe(0);
  });

  it('invalid input (wrong chosung) does not increment attempts', async () => {
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.game).not.toBeNull());
    const before = result.current.attempts;
    act(() => { result.current.setInput('가나'); });
    await act(async () => { await result.current.submitGuess(); });
    expect(result.current.attempts).toBe(before);
  });

  it('wrong guess increments attempts', async () => {
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.game).not.toBeNull());
    act(() => { result.current.setInput('서기'); });
    await act(async () => { await result.current.submitGuess(); });
    await waitFor(() => !result.current.loading);
    expect(result.current.attempts).toBe(1);
  });

  it('hint increments attempts', async () => {
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.game).not.toBeNull());
    await act(async () => { await result.current.openHint(); });
    await waitFor(() => !result.current.loading);
    expect(result.current.attempts).toBe(1);
  });

  it('mix: wrong guess + hint + wrong guess', async () => {
    const { result } = renderHook(() => useGame());
    await waitFor(() => expect(result.current.game).not.toBeNull());
    act(() => { result.current.setInput('서기'); });
    await act(async () => { await result.current.submitGuess(); });
    await waitFor(() => !result.current.loading);
    expect(result.current.attempts).toBe(1);

    await act(async () => { await result.current.openHint(); });
    await waitFor(() => !result.current.loading);
    expect(result.current.attempts).toBe(2);

    act(() => { result.current.setInput('성가'); });
    await act(async () => { await result.current.submitGuess(); });
    await waitFor(() => !result.current.loading);
    expect(result.current.attempts).toBe(3);
  });
});
