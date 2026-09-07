// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createElectrsGuiService } from "./electrs-gui-service.js";

const connections = {
  local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" as const },
  tor: { address: "example.onion", port: 50001, connectionString: "example.onion:50001", transport: "tcp" as const }
};

describe("ElectrsGuiService", () => {
  it("reports real provider progress while Bitcoin Core is in IBD", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 80, initialblockdownload: true }) },
      electrs: { getTip: async () => { throw new Error("listener closed during indexing"); }, getVersion: vi.fn() },
      progress: { getIndexedHeight: async () => 20 },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "indexing",
      version: null,
      coreHeight: 80,
      indexedHeight: 20,
      percent: 25,
      message: "Indexing Bitcoin blocks"
    });
    expect(await service.getLegacySyncPercent()).toBe(25);
  });

  it("keeps waiting for Bitcoin Core when Electrs has no reportable progress during IBD", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 80, initialblockdownload: true }) },
      electrs: { getTip: async () => { throw new Error("listener unavailable"); }, getVersion: vi.fn() },
      progress: { getIndexedHeight: async () => { throw new Error("metrics unavailable"); } },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "waiting-for-core",
      coreHeight: 80,
      indexedHeight: null,
      percent: null
    });
    expect(await service.getLegacySyncPercent()).toBe(-1);
  });

  it("returns an accurate synchronized status", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrs: { getTip: async () => 110, getVersion: async () => "0.9.12" },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "ready",
      version: "0.9.12",
      coreHeight: 110,
      indexedHeight: 110,
      percent: 100,
      message: "Electrs is synchronized"
    });
    expect(service.getConnections()).toBe(connections);
    expect(await service.getLegacyVersion()).toBe("0.9.12");
    expect(await service.getLegacySyncPercent()).toBe(100);
  });

  it("degrades safely when Bitcoin Core is unavailable", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => { throw new Error("rpcuser:secret"); } },
      electrs: { getTip: vi.fn(), getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "degraded",
      version: null,
      coreHeight: null,
      indexedHeight: null,
      percent: null,
      message: "Bitcoin Core is unavailable"
    });
  });

  it("reports connecting when Core is ready but Electrs is not", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("not ready"); }, getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "connecting",
      coreHeight: 110,
      indexedHeight: null,
      percent: null
    });
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });

  it("reports real provider progress while the Electrs listener is closed for initial indexing", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 3_157_425, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("listener closed during indexing"); }, getVersion: vi.fn() },
      progress: { getIndexedHeight: async () => 87_000 },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "indexing",
      version: null,
      coreHeight: 3_157_425,
      indexedHeight: 87_000,
      percent: 2.76,
      message: "Indexing Bitcoin blocks"
    });
    await expect(service.getLegacySyncPercent()).resolves.toBeCloseTo(2.7554, 4);
  });

  it.each([
    ["equal to", 110, false, "connecting", -2],
    ["ahead of", 111, false, "connecting", -2],
    ["equal to", 110, true, "waiting-for-core", -1],
    ["ahead of", 111, true, "waiting-for-core", -1],
  ] as const)("never infers readiness from provider progress %s Core when IBD is %s", async (_label, indexedHeight, initialblockdownload, state, legacyPercent) => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload }) },
      electrs: { getTip: async () => { throw new Error("listener unavailable"); }, getVersion: vi.fn() },
      progress: { getIndexedHeight: async () => indexedHeight },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state, indexedHeight: null, percent: null });
    expect(await service.getLegacySyncPercent()).toBe(legacyPercent);
  });

  it("preserves the legacy unclamped synchronization percentage", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 100, initialblockdownload: false }) },
      electrs: { getTip: async () => 110, getVersion: async () => "0.9.12" },
      connections
    });

    expect(await service.getLegacySyncPercent()).toBeCloseTo(110);
  });
});
