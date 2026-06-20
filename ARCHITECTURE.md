# 헤아리기 (Heari) — Architecture

Korean word-guessing game (daily puzzle). Next.js 16 + React 19 + Bun + SQLite (sql.js) + OpenRouter AI hints.

---

## Stack

- **Framework**: Next.js 16 (App Router, Edge Middleware, serverless API routes)
- **Runtime**: Bun (dev/build/run)
- **DB**: sql.js (SQLite in memory, persisted to `data/cache.db`)
- **AI**: OpenRouter API (gpt-4o-mini default)
- **PWA**: Service worker (`public/sw.js`), manifest (`src/app/manifest.ts`), push notifications
- **Styling**: Tailwind v4
- **Testing**: Bun native test runner (`bun test`)

---

## Request Flow

```
Browser  ──>  next.config.ts (security headers)
         ──>  proxy.ts (Edge Middleware: CORS + IP-based rate limiting)
         ──>  API route
```

### Routes

| Route | File | What it does |
|---|---|---|
| `GET /` | `src/app/page.tsx` | Main game page (client component) |
| `GET /api/game` | `src/app/api/game/route.ts` | Returns today's chosung |
| `GET /api/guess?input=X` | `src/app/api/guess/route.ts` | Validates guess, returns AI hint if wrong |
| `GET /api/hint` | `src/app/api/hint/route.ts` | Returns decomposed jamo (visual hint) |
| `GET /pwa-icon?size=N` | `src/app/pwa-icon/route.ts` | Dynamic PWA icon |

---

## Key Modules

### `src/lib/game.ts`
- Word selection via deterministic hash of date string → index into `words.txt`
- Chosung extraction (initial consonants only)
- Hangul syllable decomposition into jamo
- Input validation (2+ chars, all Hangul)

### `src/lib/hint.ts`
- **`getHint(input, answer)`**: entry point. Cleans cache, checks cache, calls OpenRouter, caches result.
- **`callOpenRouter(input, answer)`**: calls OpenRouter chat completions with engineered system prompt. Temperature 0.95, max 60 tokens.
- **`stripQuotes(s)`**: strips `"'「」『』` from response start/end.
- **`containsAnswer(hint, answer)`**: plain `indexOf` check — if answer appears anywhere, retry.
- Retry logic: up to 3 retries if hint leaks the answer word. Final result returned as-is if still leaking.

### `src/lib/db.ts`
- sql.js SQLite database
- **Tables**: `hint_cache` (input, answer, hint, created_at), `game_state` (date, word)
- **Functions**: `getCachedHint`, `setCachedHint`, `cleanOldCache` (deletes >3 days), `getWordForDate`, `setWordForDate`

### `src/proxy.ts`
Edge Middleware. Applies to all requests.
- CORS headers (allow all origins)
- IP-based rate limiting per route using sliding window
- Trusted proxy chain traversal (Cloudflare → Vercel → app)
- Uses `src/lib/ip.ts` and `src/lib/rate-limit.ts`

### `src/app/page.tsx` (513 lines)
Main game client component.
- **State**: guesses (history), hintJamos/revealed (visual hint), selectedHint (AI hint from log), streak, session persistence
- **UI**: chosung display → jamo grid (visual hint) → input → guess log → share buttons
- **Hint system**: `fetchHint` gets jamo breakdown, `revealJamo` reveals one by one, `toggleHintSelection` shows AI hint in log after solved
- **Sharing**: clipboard text, Mastodon/Misskey compose URLs

### Components
- `pwa-register.tsx` — registers SW, sets up periodic sync + midnight timer
- `notification-bell.tsx` — manages Notification permission, toggle UI
- `tooltip-button.tsx` — reusable button with hover/touch tooltip

---

## Data Flow

```
words.txt ──> lib/game.ts ──> api/game/route.ts
                              api/guess/route.ts ──> lib/hint.ts ──> OpenRouter API
                                                        └──> lib/db.ts (hint_cache)
                              api/hint/route.ts ──> lib/game.ts (decomposeWord)

lib/db.ts ──> data/cache.db (runtime, gitignored)
```

---

## Configuration

| Env var | Default | Used in |
|---|---|---|
| `OPENROUTER_API_KEY` | — | `src/lib/hint.ts` |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | `src/lib/hint.ts` |
| `TRUSTED_PROXY_IP` | — | `src/proxy.ts` (Cloudflare CIDRs) |
| `RATE_LIMIT_MAX_GUESS` | 50 | `src/proxy.ts` |
| `RATE_LIMIT_MAX_HINT` | 15 | `src/proxy.ts` |
| `RATE_LIMIT_WINDOW_MS` | 60000 | `src/proxy.ts` |

---

## Tests

Run with `bun test`. Tests are in `tests/`:
- `jamo.test.ts` — Hangul decomposition
- `ip.test.ts` — IP normalization/CIDR matching
- `rate-limit.test.ts` — sliding window rate limiter

---

## Conventions

- Path alias `@/*` → `src/*`
- API routes in `src/app/api/<name>/route.ts`
- Server code in `src/lib/`
- Client components in `src/components/`
- No comments in source code (caveman style preferred)
- TypeScript strict mode
