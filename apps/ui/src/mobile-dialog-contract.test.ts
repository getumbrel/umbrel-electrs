// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const cssBlock = (styles: string, selector: string) => {
  const match = styles.match(new RegExp(`\\${selector} \\{([^}]*)\\}`));
  if (!match) throw new Error(`Missing ${selector} CSS block`);
  return match[1];
};

describe("mobile connection dialog scrolling", () => {
  it("keeps the decorative border outside the scrolling content", () => {
    const panel = read("apps/ui/src/components/ConnectionPanel.tsx");
    const styles = read("apps/ui/src/styles.css");
    const dialog = cssBlock(styles, ".connection-dialog");
    const scroller = cssBlock(styles, ".connection-dialog-scroll");

    expect(panel).toContain('<div className="connection-dialog-scroll">');
    expect(dialog).toContain("overflow: hidden");
    expect(dialog).not.toMatch(/overflow(?:-y)?: auto/);
    expect(scroller).toContain("overflow-y: auto");
    expect(scroller).toContain("overscroll-behavior: contain");
  });
});
