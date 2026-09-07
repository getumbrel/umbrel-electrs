import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

const status = { state: "ready", version: "0.9.12", coreHeight: 110, indexedHeight: 110, percent: 100, message: "Electrs is synchronized" };
const connections = {
  local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" },
  tor: { address: "example.onion", port: 50001, connectionString: "example.onion:50001", transport: "tcp" }
};

afterEach(() => vi.unstubAllGlobals());

describe("App", () => {
  it("loads the status and connection contracts into the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      return new Response(JSON.stringify(path.endsWith("/api/status") ? status : connections), { status: 200 });
    }));

    render(<App />);
    expect(screen.getByLabelText("Loading Electrs")).toBeInTheDocument();
    expect(await screen.findByText("Electrs is synchronized")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
  });

  it("shows a retryable error when connection details are unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Electrs is taking longer than expected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
