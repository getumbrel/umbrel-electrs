import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("apps/ui/index.html", "utf8");

describe("HTML privacy metadata", () => {
  it("prevents indexing and referrer disclosure before the application mounts", () => {
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain('<meta name="referrer" content="no-referrer" />');
  });
});
