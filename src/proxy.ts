import { NextRequest, NextResponse } from 'next/server';
import { parseCIDR, getClientIP, DEFAULT_TRUSTED_CIDRS, type CIDR } from '@/lib/ip';
import { rateLimit, type RateLimitConfig } from '@/lib/rate-limit';

function corsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  return origin === request.nextUrl.origin ? origin : null;
}

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = corsOrigin(request);
  return origin
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
    : {};
}

function setCORSHeaders(response: NextResponse, request: NextRequest): void {
  const origin = corsOrigin(request);
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }
}

function handleCORS(request: NextRequest): NextResponse {
  const origin = corsOrigin(request);
  if (!origin) return new NextResponse(null, { status: 204 });
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    },
  });
}

function loadRouteConfig(): Record<string, RateLimitConfig> {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '', 10) || 60000;
  const maxGuess = parseInt(process.env.RATE_LIMIT_MAX_GUESS ?? '', 10) || 10;
  const maxGame = parseInt(process.env.RATE_LIMIT_MAX_GAME ?? '', 10) || 30;
  const maxHint = parseInt(process.env.RATE_LIMIT_MAX_HINT ?? '', 10) || 15;

  return {
    'GET /api/game':  { max: maxGame,  windowMs },
    'GET /api/guess': { max: maxGuess, windowMs },
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

  if (method === 'OPTIONS') {
    return handleCORS(request);
  }

  if (!routeConfig) {
    const corsRes = NextResponse.next();
    setCORSHeaders(corsRes, request);
    return corsRes;
  }

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
          'Cache-Control': 'no-store',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          ...corsHeaders(request),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  setCORSHeaders(response, request);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
