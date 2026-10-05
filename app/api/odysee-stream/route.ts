import { NextResponse } from "next/server";
import { z } from "zod";

import { isOdyseeSource, odyseeUriFromSource } from "@/lib/odysee";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

const inputSchema = z.object({ source: z.string().trim().url().refine(isOdyseeSource) });
type OdyseeResponse = { result?: { streaming_url?: unknown } };

export async function POST(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "odysee-stream"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Envie uma URL pública do Odysee." }, { status: 400 });

  const uri = odyseeUriFromSource(input.data.source);
  if (!uri) return NextResponse.json({ error: "Não foi possível identificar este vídeo do Odysee." }, { status: 400 });
  try {
    const response = await fetch("https://api.na-backend.odysee.com/api/v1/proxy?m=get", {
      method: "POST",
      headers: { "content-type": "application/json-rpc" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "get", params: { uri }, id: Date.now() }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as OdyseeResponse | null;
    const streamUrl = typeof payload?.result?.streaming_url === "string" ? payload.result.streaming_url : null;
    if (!response.ok || !isOdyseeStreamUrl(streamUrl)) throw new Error("odysee-stream-unavailable");
    return NextResponse.json({ streamUrl }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "O Odysee não liberou uma fonte reproduzível agora. Tente novamente em instantes." }, { status: 502 });
  }
}

function isOdyseeStreamUrl(value: string | null) {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname.toLowerCase().endsWith(".odycdn.com"); } catch { return false; }
}
