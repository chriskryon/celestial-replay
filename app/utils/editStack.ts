import { z } from "zod";

const videoSchema = z.object({
  url: z.string().url(),
  repetitions: z
    .number()
    .int()
    .min(1, { message: "Repetitions must be at least 0" }),
});

export function editStack(
  stackId: string,
  url: string | null = null,
  newUrl: string | null = null,
  repetitions: number | null = null,
  newRepetitions: number | null = null,
) {
  if (typeof window !== "undefined") {
    console.log(stackId, url, newUrl, repetitions, newRepetitions);
    const storedData = localStorage.getItem(stackId);

    if (storedData) {
      try {
        const parsedVideos = JSON.parse(storedData);

        // Validar os vídeos com Zod
        const videos = z.array(videoSchema).parse(parsedVideos);

        const videoIndex = videos.findIndex((video) => video.url === url);

        if (videoIndex !== -1) {
          if (newUrl !== null && newUrl !== url) {
            videos[videoIndex].url = newUrl;
          }

          if (newRepetitions !== null && newRepetitions !== repetitions) {
            if (newRepetitions < 1) {
              return {
                success: false,
                error: "New repetitions must be at least 1",
              };
            }
            videos[videoIndex].repetitions = newRepetitions;
          }

          localStorage.setItem(stackId, JSON.stringify(videos));

          return { success: true, updatedVideos: videos };
        } else {
          console.error("URL não encontrada na stack.");

          return { success: false, error: "URL not found in stack" };
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Erro de validação Zod:", error.issues[0].message);

          return { success: false, error: error.issues[0].message };
        } else {
          console.error("Erro ao editar a stack:", error);

          return { success: false, error: "Error editing stack" };
        }
      }
    } else {
      console.error("Stack não encontrada.");

      return { success: false, error: "Stack not found" };
    }
  } else {
    console.error("Ambiente não é o navegador.");

    return { success: false, error: "Environment is not the browser" };
  }
}
