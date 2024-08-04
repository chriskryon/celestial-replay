export function editStack(
  stackId: string,
  url: string | null = null,
  newUrl: string | null = null,
  repetitions: number | null = null,
  newRepetitions: number | null = null,
) {
  if (typeof window !== "undefined") {
    const storedData = localStorage.getItem(stackId);

    if (storedData) {
      try {
        const parsedVideos = JSON.parse(storedData);

        const videoIndex = parsedVideos.findIndex(
          (video: { url: string | null }) => video.url === url,
        );
        console.log("VideoIndex", videoIndex)

        if (videoIndex !== -1) {
          if (newUrl !== url) {
            parsedVideos[videoIndex].url = newUrl;
          }

          if (newRepetitions !== repetitions) {
            parsedVideos[videoIndex].repetitions = newRepetitions;
          }

          localStorage.setItem(stackId, JSON.stringify(parsedVideos));

          return { success: true, updatedVideos: parsedVideos };
        } else {
          console.error("URL não encontrada na stack.");

          return false; // Indica que a URL não foi encontrada
        }
      } catch (error) {
        console.error("Erro ao editar a stack:", error);

        return false; // Indica que houve um erro na edição
      }
    } else {
      console.error("Stack não encontrada.");

      return false; // Indica que a stack não foi encontrada
    }
  } else {
    console.error("Ambiente não é o navegador.");

    return false; // Indica que a função não pode ser executada no servidor
  }
}
