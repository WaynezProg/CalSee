import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthErrorMessage } from '@/lib/utils/error-messages';
import { getRateLimitHeaders, rateLimit } from '@/lib/auth/rate-limit';

export async function GET(request: NextRequest) {
  const result = rateLimit(request);
  const headers = getRateLimitHeaders(result);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limit_exceeded',
        message: getAuthErrorMessage('rate_limit_exceeded'),
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      { status: 429, headers },
    );
  }

  return NextResponse.json({ ok: true }, { headers });
}
