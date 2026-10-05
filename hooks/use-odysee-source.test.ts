import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOdyseeSource } from "@/hooks/use-odysee-source";
import type { VideoItem } from "@/lib/replay-playlist";

const first: VideoItem = { id: "first", src: "https://odysee.com/@SapienMedicine:4/first:a", repetitions: 1 };
const second: VideoItem = { id: "second", src: "https://odysee.com/@SapienMedicine:4/second:b", repetitions: 1 };

afterEach(() => vi.restoreAllMocks());

describe("useOdyseeSource", () => {
  it("does not reuse the previous temporary stream while the next queue item resolves", async () => {
    let resolveFirst: (response: Response) => void;
    let resolveSecond: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveSecond = resolve; })));

    const { result, rerender } = renderHook(({ video }) => useOdyseeSource(video), { initialProps: { video: first } });
    expect(result.current).toEqual({ isResolving: true, resolvedSrc: null });

    await act(async () => { resolveFirst!(new Response(JSON.stringify({ streamUrl: "https://player.odycdn.com/first.mp4" }), { status: 200 })); });
    expect(result.current).toEqual({ isResolving: false, resolvedSrc: "https://player.odycdn.com/first.mp4" });

    rerender({ video: second });
    expect(result.current).toEqual({ isResolving: true, resolvedSrc: null });

    await act(async () => { resolveSecond!(new Response(JSON.stringify({ streamUrl: "https://player.odycdn.com/second.mp4" }), { status: 200 })); });
    expect(result.current).toEqual({ isResolving: false, resolvedSrc: "https://player.odycdn.com/second.mp4" });
  });
});
