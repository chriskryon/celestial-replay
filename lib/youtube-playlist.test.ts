import { describe, expect, it } from "vitest";

import { youtubePlaylistIdFromUrl, youtubePlaylistVideoFromItem } from "@/lib/youtube-playlist";

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

  it("keeps the public video title with a valid video id", () => {
    expect(youtubePlaylistVideoFromItem({
      snippet: { resourceId: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" }, title: "  A video title  " },
    })).toEqual({ id: "dQw4w9WgXcQ", title: "A video title" });
    expect(youtubePlaylistVideoFromItem({
      snippet: { resourceId: { kind: "youtube#video", videoId: "short" }, title: "Ignored" },
    })).toBeNull();
  });
});
