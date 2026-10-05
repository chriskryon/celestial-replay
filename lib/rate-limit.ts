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
  "auth-signout": { requests: 60, window: "1 m" },
  "playlist-read": { requests: 120, window: "1 m" },
  "playlist-write": { requests: 20, window: "1 m" },
  "youtube-playlist-import": { requests: 10, window: "1 m" },
  "history-read": { requests: 120, window: "1 m" },
  "history-write": { requests: 60, window: "1 m" },
  "upload-audio": { requests: 20, window: "10 m" },
};

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const rateLimiters = new Map<string, Ratelimit>();
const localRequests = new Map<string, { timestamps: number[]; expiresAt: number }>();

function localLimit(key: string, limit: Limit) {
  const now = Date.now();
  const [amount, unit] = limit.window.split(" ");
  const windowMs = Number(amount) * ({ s: 1000, m: 60_000, h: 3_600_000 }[unit as "s" | "m" | "h"]);
  localRequests.forEach((state, entry) => {
    if (state.expiresAt <= now) localRequests.delete(entry);
  });
  const timestamps = (localRequests.get(key)?.timestamps ?? []).filter((time) => time > now - windowMs);
  const success = timestamps.length < limit.requests;
  if (success) timestamps.push(now);
  localRequests.set(key, { timestamps, expiresAt: timestamps[timestamps.length - 1] + windowMs });
  return { success, reset: timestamps[0] + windowMs };
}

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

  const key = `${scope}:${getClientKey(request)}`;
  let result: { success: boolean; reset: number };
  try {
    result = await getLimiter(scope).limit(key);
  } catch {
    // O fallback local preserva o limite sem depender das credenciais de produção.
    if (process.env.NODE_ENV === "development") {
      result = localLimit(key, limits[scope]);
    } else {
      return NextResponse.json(
        { error: "O serviço está temporariamente indisponível. Tente novamente em instantes." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
  }
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
