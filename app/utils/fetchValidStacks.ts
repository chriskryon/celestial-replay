function fetchValidStacks(): {
  name: string;
  videos: { url: string; repetitions: number }[];
}[] {
  if (typeof window !== "undefined") {
    return Object.entries(window.localStorage)
      .filter(([key, value]) => {
        if (key === "theme" || key === "ally-supports-cache") {
          return false;
        }

        try {
          const parsedValue = JSON.parse(value);

          return (
            Array.isArray(parsedValue) &&
            parsedValue.every(
              (item) =>
                typeof item === "object" &&
                "url" in item &&
                "repetitions" in item,
            )
          );
        } catch (error) {
          return false; // Não é um JSON válido
        }
      })
      .map(([stackName, stackValue]) => ({
        name: stackName,
        videos: JSON.parse(stackValue),
      }));
  } else {
    return [];
  }
}

export default fetchValidStacks;
