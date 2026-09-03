import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

export const isNeonAuthConfigured = Boolean(baseUrl && cookieSecret);

let neonAuth: ReturnType<typeof createNeonAuth> | null | undefined;

export function getNeonAuth() {
  if (!isNeonAuthConfigured) return null;

  neonAuth ??= createNeonAuth({
    baseUrl: baseUrl!,
    cookies: { secret: cookieSecret! },
    logLevel: "warn",
  });

  return neonAuth;
}
