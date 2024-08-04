function getPlaybackStatisticsFromLocalStorage() {
  if (typeof window !== "undefined") {
    // Verifica se está no ambiente do navegador
    const storedHistory = localStorage.getItem("celestial-stats");

    if (storedHistory) {
      try {
        return JSON.parse(storedHistory);
      } catch (error) {
        console.error(
          "Error parsing playback statistics from localStorage:",
          error,
        );

        return []; // Ou outro valor padrão em caso de erro
      }
    } else {
      return []; // Retorna um array vazio se a chave não existir
    }
  } else {
    return []; // Ou lance um erro se precisar que isso funcione apenas no navegador
  }
}
