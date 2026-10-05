import { describe, expect, it } from "vitest";

import { parsePlaylistDrafts } from "@/lib/replay-playlist";

describe("parsePlaylistDrafts", () => {
  it("accepts a saved Odysee entry before its temporary stream URL is resolved", () => {
    const drafts = [{
      id: "odysee-entry",
      src: "https://odysee.com/@SapienMedicine:4/core-strengthening-(energetically:a",
      repetitions: "3",
    }];

    expect(parsePlaylistDrafts(drafts, () => false)).toEqual([{
      src: drafts[0].src,
      count: 3,
    }]);
  });

  it("keeps rejecting unsupported playlist entries", () => {
    expect(parsePlaylistDrafts([{ id: "unsupported", src: "https://example.com/page", repetitions: "1" }], () => false)).toBeNull();
  });
});
