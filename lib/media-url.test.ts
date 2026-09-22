import { describe, expect, it } from "vitest";

import { normalizeVideoUrlInput } from "@/lib/media-url";

describe("normalizeVideoUrlInput", () => {
  it("keeps only the watch id for YouTube URLs with extra parameters", () => {
    expect(normalizeVideoUrlInput("https://www.youtube.com/watch?v=jLTa3RNrnmI&pp=ygUPc2FwaWVuIG1lZGljaW5l")).toBe("https://www.youtube.com/watch?v=jLTa3RNrnmI");
  });

  it("normalizes common YouTube formats to watch URLs", () => {
    expect(normalizeVideoUrlInput("https://youtu.be/jLTa3RNrnmI?si=abc")).toBe("https://www.youtube.com/watch?v=jLTa3RNrnmI");
    expect(normalizeVideoUrlInput("https://www.youtube.com/shorts/jLTa3RNrnmI?feature=share")).toBe("https://www.youtube.com/watch?v=jLTa3RNrnmI");
  });

  it("does not rewrite non-YouTube URLs", () => {
    expect(normalizeVideoUrlInput("https://cdn.example.com/video.mp4?token=abc")).toBe("https://cdn.example.com/video.mp4?token=abc");
  });
});
