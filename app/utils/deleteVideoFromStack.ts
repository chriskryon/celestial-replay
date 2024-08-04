// utils/stackUtils.ts (ou onde você armazena suas funções utilitárias)

export function deleteVideoFromStack(
  stackId: string,
  itemToDeleteIndex: number,
) {
  if (typeof window !== "undefined") {
    const storedData = localStorage.getItem(stackId);

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);

        // Remove a URL específica da stack
        parsedData.splice(itemToDeleteIndex, 1);

        if (parsedData.length === 0) {
          localStorage.removeItem(stackId);

          return { success: true, stackDeleted: true };
        } else {
          localStorage.setItem(stackId, JSON.stringify(parsedData));

          return {
            success: true,
            stackDeleted: false,
            updatedData: parsedData,
          };
        }
      } catch (error) {
        console.error("Erro ao excluir vídeo da stack:", error);

        return { success: false, error };
      }
    } else {
      console.error("Stack não encontrada.");

      return { success: false, error: "Stack não encontrada." };
    }
  } else {
    console.error("Ambiente não é o navegador.");

    return { success: false, error: "Ambiente não é o navegador." };
  }
}
