// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("server config", () => {
  it("reads the Umbrel Bitcoin Electrs environment contract", () => {
    expect(readConfig({
      PORT: "3006",
      ELECTRS_HOST: "electrs_server_1",
      ELECTRS_PORT: "50001",
      ELECTRUM_PORT: "50001",
      ELECTRUM_LOCAL_SERVICE: "umbrel.local",
      ELECTRUM_HIDDEN_SERVICE: "example.onion",
      BITCOIN_HOST: "bitcoin_core_1",
      RPC_PORT: "9332",
      RPC_USER: "gui",
      RPC_PASSWORD: "secret"
    })).toMatchObject({
      port: 3006,
      electrs: { host: "electrs_server_1", port: 50001 },
      connections: { localHost: "umbrel.local", torHost: "example.onion", port: 50001 },
      core: { host: "bitcoin_core_1", port: 9332, username: "gui", password: "secret" }
    });
  });

  it("preserves non-secret legacy defaults while requiring the RPC password", () => {
    expect(readConfig({ RPC_PASSWORD: "secret" })).toMatchObject({
      port: 3006,
      electrs: { host: "0.0.0.0", port: 50001 },
      connections: { localHost: "umbrel.local", torHost: "/var/lib/tor/electrum/hostname", port: 50001 },
      core: { host: "172.28.0.2", port: 18443, username: "umbrel", password: "secret" }
    });
  });

  it("configures the exact-image Electrs metrics endpoint", () => {
    expect(readConfig({ RPC_PASSWORD: "secret" }).metrics).toEqual({ host: "0.0.0.0", port: 4224 });
    expect(readConfig({
      RPC_PASSWORD: "secret",
      ELECTRS_METRICS_HOST: "electrs",
      ELECTRS_METRICS_PORT: "4225",
    }).metrics).toEqual({ host: "electrs", port: 4225 });
  });

  it("rejects missing credentials rather than shipping fallback secrets", () => {
    expect(() => readConfig({})).toThrow("Invalid Electrs GUI configuration");
  });
});
