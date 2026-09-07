// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const service = {
  async getStatus() {
    return { state: "ready" as const, version: "0.9.12", coreHeight: 110, indexedHeight: 110, percent: 100, message: "Electrs is synchronized" };
  },
  getConnections() {
    return {
      local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" as const },
      tor: { address: "example.onion", port: 50001, connectionString: "example.onion:50001", transport: "tcp" as const }
    };
  },
  async getLegacyVersion() { return "0.9.12"; },
  async getLegacySyncPercent() { return 100; }
};

const apps: Array<ReturnType<typeof buildApp>> = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

describe("Electrs API", () => {
  it("preserves the Umbrel ping contract", async () => {
    const app = buildApp({ service, serveUi: false });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/ping" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ version: "umbrel-middleware-0.1.12" });
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["content-security-policy"]).toContain("style-src 'self' 'unsafe-inline'");
    expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(response.headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
    expect(response.headers).not.toHaveProperty("cross-origin-opener-policy");
    expect(response.headers).not.toHaveProperty("origin-agent-cluster");
  });

  it("serves the modern status contract and legacy compatibility routes", async () => {
    const app = buildApp({ service, serveUi: false });
    apps.push(app);
    const status = await app.inject({ method: "GET", url: "/api/status" });
    const legacyVersion = await app.inject({ method: "GET", url: "/v1/electrs/version" });
    const legacySync = await app.inject({ method: "GET", url: "/v1/electrs/syncPercent" });

    expect(status.json()).toMatchObject({ state: "ready", percent: 100 });
    expect(legacyVersion.json()).toBe("0.9.12");
    expect(legacySync.json()).toBe(100);
  });

  it("does not expose internal errors or credentials", async () => {
    const app = buildApp({
      service: { ...service, getStatus: async () => { throw new Error("http://umbrel:secret@bitcoin:9332 private payload"); } },
      serveUi: false
    });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/api/status" });
    expect(response.statusCode).toBe(503);
    expect(response.body).toBe('{"error":"Electrs status is temporarily unavailable"}');
    expect(response.body).not.toContain("secret");

    const legacy = buildApp({
      service: { ...service, getLegacyVersion: async () => { throw new Error("wallet-secret"); } },
      serveUi: false
    });
    apps.push(legacy);
    const legacyResponse = await legacy.inject({ method: "GET", url: "/v1/electrs/version" });
    expect(legacyResponse.statusCode).toBe(503);
    expect(legacyResponse.body).not.toContain("wallet-secret");
  });

  it("preserves legacy startup sentinels and connection details", async () => {
    const waiting = buildApp({ service: { ...service, getLegacySyncPercent: async () => -1 }, serveUi: false });
    const connecting = buildApp({ service: { ...service, getLegacySyncPercent: async () => -2 }, serveUi: false });
    const zeroHeight = buildApp({ service: { ...service, getLegacySyncPercent: async () => Number.POSITIVE_INFINITY }, serveUi: false });
    apps.push(waiting, connecting, zeroHeight);

    expect((await waiting.inject({ method: "GET", url: "/v1/electrs/syncPercent" })).json()).toBe(-1);
    expect((await connecting.inject({ method: "GET", url: "/v1/electrs/syncPercent" })).json()).toBe(-2);
    expect((await zeroHeight.inject({ method: "GET", url: "/v1/electrs/syncPercent" })).body).toBe("null");
    expect((await waiting.inject({ method: "GET", url: "/api/connections" })).json()).toEqual(service.getConnections());
    expect((await waiting.inject({ method: "GET", url: "/v1/electrs/electrum-connection-details" })).json()).toEqual({
      local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001" },
      tor: { address: "example.onion", port: 50001, connectionString: "example.onion:50001" }
    });
  });

  it("preserves the empty 404 contract for unknown paths and methods", async () => {
    const app = buildApp({ service, serveUi: false });
    apps.push(app);
    const path = await app.inject({ method: "GET", url: "/missing" });
    const method = await app.inject({ method: "POST", url: "/ping" });
    expect(path.statusCode).toBe(404);
    expect(path.body).toBe("");
    expect(method.statusCode).toBe(404);
    expect(method.body).toBe("");
  });
});
