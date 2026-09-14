import { del, list } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { AUDIO_MIME_EXTENSIONS, isOwnUploadUrl } from "@/lib/media-url";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES_PER_USER = 20;
const MAX_BYTES_PER_USER = 200 * 1024 * 1024;

export async function GET(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "upload-audio"); if (rateLimitError) return rateLimitError;
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Faça login para consultar seus áudios." }, { status: 401 });

  const { blobs } = await list({ prefix: `audio/${user.id}/` });
  return NextResponse.json({
    files: blobs.map((blob) => ({ url: blob.url, pathname: blob.pathname, size: blob.size, uploadedAt: blob.uploadedAt })),
    maxFiles: MAX_FILES_PER_USER,
    maxBytes: MAX_BYTES_PER_USER,
  });
}

export async function DELETE(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "upload-audio"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Faça login para apagar áudio." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const url = body?.url;
  if (!url || !isOwnUploadUrl(url)) return NextResponse.json({ error: "URL inválida." }, { status: 400 });

  const pathname = new URL(url).pathname.replace(/^\//, "");
  if (!pathname.startsWith(`audio/${user.id}/`)) return NextResponse.json({ error: "Você só pode apagar seus próprios áudios." }, { status: 403 });

  await del(url);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  // O evento "upload-completed" é um webhook do próprio Vercel Blob (server-to-server),
  // não uma requisição do navegador — checagens de sessão/origem só valem pra geração de token.
  let userId: string | null = null;
  if (body.type === "blob.generate-client-token") {
    const rateLimitError = await requireWithinRateLimit(request, "upload-audio"); if (rateLimitError) return rateLimitError;
    const originError = requireSameOrigin(request); if (originError) return originError;
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Faça login para enviar áudio." }, { status: 401 });
    userId = user.id;
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!userId || !pathname.startsWith(`audio/${userId}/`)) throw new Error("Caminho de upload inválido.");

        const existing = await list({ prefix: `audio/${userId}/` });
        const totalBytes = existing.blobs.reduce((sum, blob) => sum + blob.size, 0);
        if (existing.blobs.length >= MAX_FILES_PER_USER || totalBytes >= MAX_BYTES_PER_USER) {
          throw new Error("Limite de armazenamento de áudio atingido.");
        }

        return {
          allowedContentTypes: Object.keys(AUDIO_MIME_EXTENSIONS),
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_BYTES,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no upload." }, { status: 400 });
  }
}
