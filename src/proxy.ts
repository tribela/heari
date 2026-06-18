import { NextRequest, NextResponse } from 'next/server';
import { parseCIDR, getClientIP, DEFAULT_TRUSTED_CIDRS, type CIDR } from '@/lib/ip';
import { rateLimit, type RateLimitConfig } from '@/lib/rate-limit';

function loadRouteConfig(): Record<string, RateLimitConfig> {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '', 10) || 60000;
  const maxGuess = parseInt(process.env.RATE_LIMIT_MAX_GUESS ?? '', 10) || 10;
  const maxGame = parseInt(process.env.RATE_LIMIT_MAX_GAME ?? '', 10) || 30;
  const maxHint = parseInt(process.env.RATE_LIMIT_MAX_HINT ?? '', 10) || 15;

  return {
    'GET /api/game':  { max: maxGame,  windowMs },
    'POST /api/guess': { max: maxGuess, windowMs },
    'GET /api/hint':   { max: maxHint,  windowMs },
  };
}

function loadTrustedCIDRs(): CIDR[] {
  const raw = process.env.TRUSTED_PROXY_IP ?? '';
  if (!raw) return DEFAULT_TRUSTED_CIDRS;
  return raw.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => parseCIDR(s))
    .filter((c): c is CIDR => c !== null);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const method = request.method;
  const routeKey = `${method} ${pathname}`;
  const configs = loadRouteConfig();

  const routeConfig = Object.entries(configs).find(([key]) => {
    const [m, p] = key.split(' ');
    return m === method && p === pathname;
  });

  if (!routeConfig) return NextResponse.next();

  const [, rlConfig] = routeConfig;
  const xff = request.headers.get('x-forwarded-for') ?? '';
  const trusted = loadTrustedCIDRs();
  const ip = getClientIP(xff, trusted);
  const result = rateLimit(ip, rlConfig);

  if (!result.allowed) {
    return NextResponse.json(
      { error: '너무 많은 요청입니다', retryAfter: Math.ceil(result.retryAfter / 1000) },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.retryAfter / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
