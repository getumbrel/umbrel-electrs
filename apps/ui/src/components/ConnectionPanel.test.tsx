import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionPanel } from "./ConnectionPanel.js";

const details = {
  local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" as const },
  tor: { address: "electrs.example.onion", port: 50001, connectionString: "electrs.example.onion:50001", transport: "tcp" as const }
};

describe("ConnectionPanel", () => {
  it("defaults to the official Local wallet endpoint", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByRole("tab", { name: "Local" })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    Reflect.deleteProperty(document, "execCommand");
  });

  it("switches between distinct Local and Tor endpoints", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Tor" }));
    expect(screen.getByText("electrs.example.onion")).toBeInTheDocument();
  });

  it("shows a QR code for the active wallet connection", async () => {
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    const image = await screen.findByRole("img", { name: "QR code for umbrel.local:50001" });
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(image.getAttribute("src")).toContain("%23F7931A");
  });

  it("orders the connection contract rows and exposes SSL as read-only None", async () => {
    const { container } = render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    const rows = Array.from(container.ownerDocument.querySelectorAll(".connection-row"));
    expect(rows.map((row) => row.querySelector(".row-label")?.textContent)).toEqual([
      "Address",
      "Port",
      "Connection string",
      "SSL",
    ]);
    expect(rows.at(-1)?.querySelector(".row-value")).toHaveTextContent("None");
    expect(within(rows.at(-1) as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });

  it("copies every value on an insecure HTTP origin without the modern clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    const copied: string[] = [];
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn((command: string) => {
        expect(command).toBe("copy");
        copied.push(document.getSelection()?.toString() ?? "");
        return true;
      }),
    });

    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    const controls = [
      ["Copy address", "umbrel.local"],
      ["Copy port", "50001"],
      ["Copy connection string", "umbrel.local:50001"],
    ] as const;

    for (const [name, payload] of controls) {
      const button = screen.getByRole("button", { name });
      await userEvent.click(button);
      expect(copied.at(-1)).toBe(payload);
      expect(within(button.parentElement!).getByText("Copied!")).toBeVisible();
    }

    expect(copied).toEqual(controls.map(([, payload]) => payload));
  });

  it("copies the complete wallet connection string with the modern clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy connection string" }));
    expect(writeText).toHaveBeenCalledWith("umbrel.local:50001");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("falls back locally when the modern clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const copied: string[] = [];
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => {
        copied.push(document.getSelection()?.toString() ?? "");
        return true;
      }),
    });

    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    const button = screen.getByRole("button", { name: "Copy port" });
    await userEvent.click(button);

    expect(writeText).toHaveBeenCalledWith("50001");
    expect(copied).toEqual(["50001"]);
    expect(within(button.parentElement!).getByText("Copied!")).toBeVisible();
  });

  it("reports a clipboard failure without exposing an internal error", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("private clipboard detail")) },
    });
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => false) });
    vi.spyOn(window, "prompt").mockReturnValue(null);
    render(<ConnectionPanel details={details} />);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy address" }));
    expect(screen.getByText("Copy failed")).toBeInTheDocument();
    expect(screen.queryByText(/private clipboard detail/i)).not.toBeInTheDocument();
  });
});
