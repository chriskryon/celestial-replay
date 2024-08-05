import { z } from "zod";
import ReactPlayer from "react-player";

const videoSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => ReactPlayer.canPlay(url), {
      message: "Unsupported URL or player.",
    }),
  repetitions: z
    .number()
    .int()
    .min(1, { message: "Repetitions must be at least 1" }),
});

export default function validateInputs(videoInput: string): boolean {
  if (!videoInput) return false;

  const lines = videoInput.split("\n");

  for (const line of lines) {
    const [url, repetitionsStr] = line.split(";");

    try {
      videoSchema.parse({ url, repetitions: parseInt(repetitionsStr, 10) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Erro de validação:", error.issues[0].message); // Ou exibir a mensagem para o usuário
      }

      return false;
    }
  }

  return true;
}
