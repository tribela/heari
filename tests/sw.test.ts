import { describe, it, expect, mock, afterEach } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SW_PATH = join(import.meta.dir, '..', 'public', 'sw.js');
const GAME_URL = 'https://heari.11ax.net/api/game';

function todayKst(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function daysAgoKst(n: number): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000 - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function gameResponse(date: string, maxAgeSeconds = 86400, generatedAt = Date.now()): Response {
  return new Response(JSON.stringify({ chosung: 'ㅈㄷ', date }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${maxAgeSeconds}, max-age=${maxAgeSeconds}, must-revalidate`,
      Date: new Date(generatedAt).toUTCString(),
    },
  });
}

interface SwHarness {
  handlers: Record<string, Function[]>;
  stores: Map<string, Map<string, Response>>;
  messages: { type: string; date: string; chosung: string }[];
  networkCalls: { count: number };
  dispatchFetch: (url: string) => Promise<{ response: Response | null; pending: Promise<unknown>[] }>;
}

const savedGlobals = new Map<string, unknown>();

function loadSw(seed: { name: string; url: string; response: Response }[] = []): SwHarness {
  const code = readFileSync(SW_PATH, 'utf-8');
  const handlers: Record<string, Function[]> = {};
  const stores = new Map<string, Map<string, Response>>();
  const messages: { type: string; date: string; chosung: string }[] = [];
  const networkCalls = { count: 0 };

  for (const { name, url, response } of seed) {
    if (!stores.has(name)) stores.set(name, new Map());
    stores.get(name)!.set(url, response);
  }

  const cacheStorage = {
    stores,
    async open(name: string) {
      if (!this.stores.has(name)) this.stores.set(name, new Map());
      return {
        match: async (key: string) => this.stores.get(name)!.get(key),
        put: async (key: string, res: Response) => {
          this.stores.get(name)!.set(key, res);
        },
      };
    },
    async keys() {
      return [...this.stores.keys()];
    },
    async delete(name: string) {
      return this.stores.delete(name);
    },
  };

  const self = {
    skipWaiting: mock(() => {}),
    location: { origin: 'https://heari.11ax.net' },
    clients: {
      matchAll: mock(async () => [
        { postMessage: (m: { type: string; date: string; chosung: string }) => messages.push(m) },
      ]),
      claim: mock(async () => {}),
    },
    addEventListener: (type: string, fn: Function) => {
      (handlers[type] ||= []).push(fn);
    },
  };

  for (const key of ['self', 'caches', 'fetch'] as const) {
    savedGlobals.set(key, (globalThis as Record<string, unknown>)[key]);
  }
  (globalThis as Record<string, unknown>).self = self;
  (globalThis as Record<string, unknown>).caches = cacheStorage;
  (globalThis as Record<string, unknown>).fetch = mock(async () => {
    networkCalls.count++;
    return gameResponse(todayKst());
  });

  // eslint-disable-next-line no-eval
  eval(code);

  const dispatchFetch = async (url: string) => {
    const pending: Promise<unknown>[] = [];
    let responsePromise: Promise<Response> | null = null;
    const event = {
      request: new Request(url),
      respondWith: (p: Promise<Response>) => {
        responsePromise = p;
      },
      waitUntil: (p: Promise<unknown>) => {
        pending.push(p);
      },
    };
    handlers.fetch[0](event);
    return { response: responsePromise ? await responsePromise : null, pending };
  };

  return { handlers, stores, messages, networkCalls, dispatchFetch };
}

afterEach(() => {
  for (const [key, value] of savedGlobals) {
    (globalThis as Record<string, unknown>)[key] = value;
  }
  savedGlobals.clear();
});

describe('sw.js /api/game stale-while-revalidate', () => {
  it('install: skipWaiting 호출', () => {
    const { handlers } = loadSw();
    const event = { waitUntil: mock(() => {}) };
    handlers.install[0](event);
  });

  it('activate: 구버전 캐시 정리', async () => {
    const { handlers, stores } = loadSw([
      { name: 'heari-api-v1', url: GAME_URL, response: gameResponse(todayKst()) },
      { name: 'old-cache', url: 'https://heari.11ax.net/', response: new Response('x') },
    ]);
    const pending: Promise<unknown>[] = [];
    handlers.activate[0]({ waitUntil: (p: Promise<unknown>) => pending.push(p) });
    await Promise.all(pending);
    expect([...stores.keys()]).toEqual(['heari-api-v1']);
  });

  it('캐시 미스: 네트워크 응답 + 캐시 저장', async () => {
    const { dispatchFetch, stores, networkCalls } = loadSw();
    const { response, pending } = await dispatchFetch(GAME_URL);
    await Promise.all(pending);
    expect(response!.status).toBe(200);
    expect((await response!.clone().json()).date).toBe(todayKst());
    expect(networkCalls.count).toBe(1);
    const cached = stores.get('heari-api-v1')!.get(GAME_URL)!;
    expect((await cached.clone().json()).date).toBe(todayKst());
  });

  it('당일 캐시: 캐시 즉시 반환 + 백그라운드 재검증 진행 (date 같으면 메시지는 클라이언트가 무시)', async () => {
    const { dispatchFetch, stores, messages, networkCalls } = loadSw([
      { name: 'heari-api-v1', url: GAME_URL, response: gameResponse(todayKst(), 86400) },
    ]);
    const { response, pending } = await dispatchFetch(GAME_URL);
    expect((await response!.json()).date).toBe(todayKst());
    expect(networkCalls.count).toBe(1);

    await Promise.all(pending);

    const cached = stores.get('heari-api-v1')!.get(GAME_URL)!;
    expect((await cached.clone().json()).date).toBe(todayKst());
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ type: 'new-game', date: todayKst() });
  });

  it('만료 캐시: stale 즉시 반환 + 백그라운드 재검증 + new-game 메시지', async () => {
    const { dispatchFetch, stores, messages, networkCalls } = loadSw([
      // max-age 60s지만 생성된 지 2분 지남 → 만료 상태
      { name: 'heari-api-v1', url: GAME_URL, response: gameResponse(daysAgoKst(1), 60, Date.now() - 120_000) },
    ]);
    const { response, pending } = await dispatchFetch(GAME_URL);
    expect((await response!.json()).date).toBe(daysAgoKst(1));
    expect(networkCalls.count).toBe(1);

    await Promise.all(pending);

    const cached = stores.get('heari-api-v1')!.get(GAME_URL)!;
    expect((await cached.clone().json()).date).toBe(todayKst());
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ type: 'new-game', date: todayKst(), chosung: 'ㅈㄷ' });
  });

  it('재검증 응답이 실패면 stale 유지 + 메시지 없음', async () => {
    const { dispatchFetch, stores, messages, networkCalls } = loadSw([
      { name: 'heari-api-v1', url: GAME_URL, response: gameResponse(daysAgoKst(1), 60, Date.now() - 120_000) },
    ]);
    const origFetch = (globalThis as Record<string, unknown>).fetch;
    (globalThis as Record<string, unknown>).fetch = mock(async () => {
      networkCalls.count++;
      return new Response('error', { status: 500 });
    });
    const { pending } = await dispatchFetch(GAME_URL);
    await Promise.all(pending);
    const cached = stores.get('heari-api-v1')!.get(GAME_URL)!;
    expect((await cached.clone().json()).date).toBe(daysAgoKst(1));
    expect(messages).toHaveLength(0);
    (globalThis as Record<string, unknown>).fetch = origFetch;
  });

  it('비-API 요청은 인터셉트하지 않음', async () => {
    const { handlers } = loadSw();
    const respondWith = mock(() => {});
    handlers.fetch[0]({
      request: new Request('https://heari.11ax.net/'),
      respondWith,
      waitUntil: mock(() => {}),
    });
    expect(respondWith).not.toHaveBeenCalled();
  });
});
