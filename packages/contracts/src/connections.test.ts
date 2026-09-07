import { describe, expect, it } from "vitest";
import { connectionDetailsSchema, createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct Bitcoin LAN and Tor connection records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "electrs.example.onion", port: "50001" })).toEqual({
      local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" },
      tor: { address: "electrs.example.onion", port: 50001, connectionString: "electrs.example.onion:50001", transport: "tcp" }
    });
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });

  it("rejects connection payloads whose user-facing string is not exactly host:port", () => {
    const base = createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "50001" });
    expect(connectionDetailsSchema.safeParse({
      ...base,
      local: { ...base.local, connectionString: "umbrel.local:51002" },
    }).success).toBe(false);
    expect(connectionDetailsSchema.safeParse({
      ...base,
      tor: { ...base.tor, connectionString: "other.onion:50001" },
    }).success).toBe(false);
  });
});
