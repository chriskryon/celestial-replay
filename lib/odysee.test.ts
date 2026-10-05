import { describe, expect, it } from "vitest";

import { isOdyseeSource, odyseeUriFromSource } from "@/lib/odysee";

describe("Odysee sources", () => {
  it("recognizes public Odysee URLs only", () => {
    expect(isOdyseeSource("https://odysee.com/@SapienMedicine:4/core-strengthening-(energetically:a")).toBe(true);
    expect(isOdyseeSource("https://www.odysee.com/@SapienMedicine:4/core-strengthening-(energetically:a")).toBe(true);
    expect(isOdyseeSource("https://odysee.com.evil.test/video")).toBe(false);
  });

  it("converts a public Odysee path into the LBRY URI expected by its resolver", () => {
    expect(odyseeUriFromSource("https://odysee.com/@SapienMedicine:4/core-strengthening-(energetically:a"))
      .toBe("lbry://@SapienMedicine#4/core-strengthening-(energetically#a");
  });

  it("rejects an unrelated source", () => {
    expect(odyseeUriFromSource("https://example.com/video")).toBeNull();
  });
});
