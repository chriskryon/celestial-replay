"use client";

import { authClient } from "@/lib/auth-client";

export default function AuthCallbackPage() {
  void authClient;
  return <p className="auth-callback-status" role="status">Concluindo autenticação…</p>;
}
