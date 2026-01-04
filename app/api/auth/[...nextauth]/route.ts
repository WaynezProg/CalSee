import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { getAuthErrorMessage } from "@/lib/utils/error-messages";
import { getRateLimitHeaders, rateLimit } from "@/lib/auth/rate-limit";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  ...(process.env.NODE_ENV === "production"
    ? { "Strict-Transport-Security": "max-age=31536000" }
    : {}),
};

async function handleAuth(request: NextRequest) {
  const pathname = new URL(request.url).pathname;
  const shouldRateLimit =
    pathname.includes("/api/auth/signin") || pathname.includes("/api/auth/callback");
  const result = shouldRateLimit ? rateLimit(request) : null;
  const rateLimitHeaders = result ? getRateLimitHeaders(result) : {};

  if (result && !result.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        message: getAuthErrorMessage("rate_limit_exceeded"),
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders,
          ...securityHeaders,
        },
      }
    );
  }

  const handler = request.method === "POST" ? handlers.POST : handlers.GET;
  const response = await handler(request);
  const mergedHeaders = new Headers(response.headers);

  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    mergedHeaders.set(key, value);
  });

  Object.entries(securityHeaders).forEach(([key, value]) => {
    mergedHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders,
  });
}

export { handleAuth as GET, handleAuth as POST };
