import { describe, expect, it, vi } from "vitest";
import { fetchConnections, fetchStatus } from "./api.js";

describe("GUI API client", () => {
  it("validates status responses", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ state: "ready", version: "0.9.12", coreHeight: 110, indexedHeight: 110, percent: 100, message: "Electrs is synchronized" }), { status: 200 }));
    expect(await fetchStatus(fetchFn)).toMatchObject({ state: "ready", percent: 100 });
  });

  it("rejects malformed status responses", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ state: "ready", percent: 900 }), { status: 200 }));
    await expect(fetchStatus(fetchFn)).rejects.toThrow("Electrs returned an invalid status response");
  });

  it("validates connection responses", async () => {
    const payload = {
      local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" },
      tor: { address: "example.onion", port: 50001, connectionString: "example.onion:50001", transport: "tcp" }
    };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    expect(await fetchConnections(fetchFn)).toEqual(payload);
  });
});
