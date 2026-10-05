import { describe, expect, it } from "vitest";

import { isSupportedReplaySource } from "@/lib/replay-source";

describe("isSupportedReplaySource", () => {
  it("accepts a direct ReactPlayer source or a public Odysee source", () => {
    expect(isSupportedReplaySource("https://cdn.example.com/video.mp4", (source) => source.endsWith(".mp4"))).toBe(true);
    expect(isSupportedReplaySource("https://odysee.com/@SapienMedicine:4/core-strengthening-(energetically:a", () => false)).toBe(true);
  });

  it("rejects URLs that neither the player nor a source adapter can handle", () => {
    expect(isSupportedReplaySource("https://example.com/page", () => false)).toBe(false);
  });
});
