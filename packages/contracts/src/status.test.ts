import { describe, expect, it } from "vitest";
import { deriveIndexerStatus } from "./status.js";

describe("deriveIndexerStatus", () => {
  it("waits for Bitcoin Core while initial block download is active", () => {
    expect(deriveIndexerStatus({ coreHeight: 100, indexedHeight: null, initialBlockDownload: true, version: null })).toMatchObject({
      state: "waiting-for-core",
      percent: null,
      message: "Waiting for Bitcoin Core to finish syncing"
    });
  });

  it("preserves a legitimate zero height instead of treating it as unavailable", () => {
    expect(deriveIndexerStatus({ coreHeight: 100, indexedHeight: 0, initialBlockDownload: false, version: "0.9.12" })).toMatchObject({
      state: "indexing",
      percent: 0,
      indexedHeight: 0
    });
  });

  it("does not round incomplete synchronization up to ready", () => {
    expect(deriveIndexerStatus({ coreHeight: 101, indexedHeight: 100, initialBlockDownload: false, version: "0.9.12" })).toMatchObject({
      state: "indexing",
      percent: 99.01
    });
  });

  it("clamps an indexer ahead of Core and reports ready", () => {
    expect(deriveIndexerStatus({ coreHeight: 100, indexedHeight: 101, initialBlockDownload: false, version: "0.9.12" })).toMatchObject({
      state: "ready",
      percent: 100
    });
  });

  it("reports connecting when the indexer is unavailable", () => {
    expect(deriveIndexerStatus({ coreHeight: 100, indexedHeight: null, initialBlockDownload: false, version: null })).toMatchObject({
      state: "connecting",
      percent: null
    });
  });
});
