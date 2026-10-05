import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redisLimit } = vi.hoisted(() => ({ redisLimit: vi.fn() }));

vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn();
    limit = redisLimit;
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubEnv("KV_REST_API_URL", "https://redis.example.com");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
  redisLimit.mockReset();
  redisLimit.mockRejectedValue(new Error("WRONGPASS"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("rate limit with unavailable Redis", () => {
  it("keeps the development login limit and allows retry after its window", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { requireWithinRateLimit } = await import("./rate-limit");
    const request = new Request("http://localhost:3000/api/auth/sign-in/social");
    for (let attempt = 0; attempt < 10; attempt++) {
      expect(await requireWithinRateLimit(request, "auth")).toBeNull();
    }
    expect((await requireWithinRateLimit(request, "auth"))?.status).toBe(429);
    vi.advanceTimersByTime(600_000);
    expect(await requireWithinRateLimit(request, "auth")).toBeNull();
  });

  it("does not clear the longer auth window when another scope is used", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { requireWithinRateLimit } = await import("./rate-limit");
    const request = new Request("http://localhost:3000/api/auth/sign-in/social");
    for (let attempt = 0; attempt < 10; attempt++) await requireWithinRateLimit(request, "auth");
    vi.advanceTimersByTime(120_000);
    expect(await requireWithinRateLimit(request, "auth-signout")).toBeNull();
    expect((await requireWithinRateLimit(request, "auth"))?.status).toBe(429);
  });

  it("blocks production requests with a controlled service-unavailable response", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { requireWithinRateLimit } = await import("./rate-limit");
    const response = await requireWithinRateLimit(new Request("https://example.com/api/auth/sign-in/social"), "auth");
    expect(response?.status).toBe(503);
    expect(response?.headers.get("Retry-After")).toBe("30");
  });

  it("preserves the Redis result when the service is available", async () => {
    vi.stubEnv("NODE_ENV", "development");
    redisLimit.mockResolvedValue({ success: false, reset: Date.now() + 60_000 });
    const { requireWithinRateLimit } = await import("./rate-limit");
    expect((await requireWithinRateLimit(new Request("http://localhost:3000/api/auth/sign-in/social"), "auth"))?.status).toBe(429);
  });
});
