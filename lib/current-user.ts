import { getNeonAuth } from "@/lib/auth";

export async function getCurrentUser() {
  const auth = getNeonAuth();
  if (!auth) return null;

  const { data, error } = await auth.getSession();
  return error ? null : data?.user ?? null;
}
