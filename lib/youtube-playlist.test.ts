import { describe, expect, it } from "vitest";

import { youtubePlaylistIdFromUrl } from "@/lib/youtube-playlist";

describe("youtubePlaylistIdFromUrl", () => {
  it("extracts a public playlist id from playlist and watch URLs", () => {
    expect(youtubePlaylistIdFromUrl("https://www.youtube.com/playlist?list=PL1234567890_abc"))
      .toBe("PL1234567890_abc");
    expect(youtubePlaylistIdFromUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890_abc"))
      .toBe("PL1234567890_abc");
  });

  it("rejects non-YouTube URLs and malformed playlist ids", () => {
    expect(youtubePlaylistIdFromUrl("https://example.com/playlist?list=PL1234567890_abc")).toBeNull();
    expect(youtubePlaylistIdFromUrl("http://www.youtube.com/playlist?list=PL1234567890_abc")).toBeNull();
    expect(youtubePlaylistIdFromUrl("https://www.youtube.com/playlist?list=short")).toBeNull();
    expect(youtubePlaylistIdFromUrl("not-a-url")).toBeNull();
  });
});
