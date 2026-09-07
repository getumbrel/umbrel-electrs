// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createElectrsMetricsClient } from "./electrs-metrics-client.js";

describe("ElectrsMetricsClient", () => {
  it("reads the exact v0.11.1 Prometheus index-height gauge", async () => {
    const fetchFn = vi.fn(async () => new Response([
      "# HELP electrs_index_height Indexed block height",
      "# TYPE electrs_index_height gauge",
      'electrs_index_height{type="tip"} 87000',
      "",
    ].join("\n")));
    const client = createElectrsMetricsClient({ host: "electrs", port: 4224, fetchFn });
    await expect(client.getIndexedHeight()).resolves.toBe(87_000);
  });

  it("rejects absent, duplicate, malformed, and non-finite gauges", async () => {
    for (const body of ["", 'electrs_index_height{type="tip"} 1\nelectrs_index_height{type="tip"} 2\n', 'electrs_index_height{type="tip"} NaN\n']) {
      const client = createElectrsMetricsClient({ host: "electrs", port: 4224, fetchFn: async () => new Response(body) });
      await expect(client.getIndexedHeight()).rejects.toThrow("Electrs metrics response was invalid");
    }
  });
});
