import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

type Limit = {
  requests: number;
  window: `${number} ${"s" | "m" | "h"}`;
};

const limits: Record<string, Limit> = {
  auth: { requests: 10, window: "10 m" },
  "playlist-read": { requests: 120, window: "1 m" },
  "playlist-write": { requests: 20, window: "1 m" },
  "history-read": { requests: 120, window: "1 m" },
  "history-write": { requests: 60, window: "1 m" },
};

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const rateLimiters = new Map<string, Ratelimit>();

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

function getLimiter(scope: keyof typeof limits) {
  const existing = rateLimiters.get(scope);
  if (existing) return existing;

  const limit = limits[scope];
  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(limit.requests, limit.window),
    prefix: "celestial-replay:rate-limit",
  });
  rateLimiters.set(scope, limiter);
  return limiter;
}

export async function requireWithinRateLimit(request: Request, scope: keyof typeof limits) {
  if (!redis) return null;

  const result = await getLimiter(scope).limit(`${scope}:${getClientKey(request)}`);
  if (result.success) return null;

  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Muitas solicitações. Tente novamente em instantes." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limits[scope].requests),
        "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
      },
    },
  );
}
