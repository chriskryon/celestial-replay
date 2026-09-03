import { NextResponse } from "next/server";

import { getNeonAuth } from "@/lib/auth";

type AuthContext = { params: Promise<{ path: string[] }> };

function unavailable() {
  return NextResponse.json(
    { error: "A autenticação ainda não foi configurada neste ambiente." },
    { status: 503 },
  );
}

async function handle(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH", request: Request, context: AuthContext) {
  const auth = getNeonAuth();
  if (!auth) return unavailable();
  return auth.handler()[method](request, context);
}

export const GET = (request: Request, context: AuthContext) => handle("GET", request, context);
export const POST = (request: Request, context: AuthContext) => handle("POST", request, context);
export const PUT = (request: Request, context: AuthContext) => handle("PUT", request, context);
export const DELETE = (request: Request, context: AuthContext) => handle("DELETE", request, context);
export const PATCH = (request: Request, context: AuthContext) => handle("PATCH", request, context);
