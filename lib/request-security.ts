import { NextResponse } from "next/server";

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.APP_ORIGIN;
  if (!origin || !configured || origin !== configured) return NextResponse.json({ error: "Origem da requisição não permitida." }, { status: 403 });
  return null;
}
