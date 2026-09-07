// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSocket } from "node:dgram";
import { once } from "node:events";
import { createElectrsLogProgress, startElectrsLogReceiver } from "./electrs-log-progress.js";

describe("ElectrsLogProgress", () => {
  it("uses the newest complete real Electrs indexing marker", async () => {
    let now = 1_000;
    const progress = createElectrsLogProgress({ now: () => now, freshnessMs: 300_000 });

    progress.accept(Buffer.from("<13> electrs-progress: Tx indexing is up to height=80000"));
    now += 1;
    progress.accept(Buffer.from("<13> electrs-progress: History indexing is up to height=70000"));

    await expect(progress.getIndexedHeight()).resolves.toBe(70_000);
  });

  it("ignores malformed, partial, oversized, and out-of-range markers", async () => {
    const progress = createElectrsLogProgress({ now: () => 1_000, maxDatagramBytes: 128 });

    progress.accept(Buffer.from("<13> electrs-progress: History indexing is up to height="));
    progress.accept(Buffer.from("<13> electrs-progress: History indexing is up to height=999999999999999999999"));
    progress.accept(Buffer.alloc(129, 65));

    await expect(progress.getIndexedHeight()).resolves.toBeNull();
  });

  it("expires stale progress and accepts markers only from the configured syslog tag", async () => {
    let now = 1_000;
    const progress = createElectrsLogProgress({ now: () => now, freshnessMs: 10 });
    progress.accept(Buffer.from("<13> electrs-progress: History indexing is up to height=70000"));
    now += 11;
    await expect(progress.getIndexedHeight()).resolves.toBeNull();

    progress.accept(Buffer.from("<13> attacker: History indexing is up to height=90000"));
    await expect(progress.getIndexedHeight()).resolves.toBeNull();
  });

  it("rejects a nested electrs-progress token when the RFC3164 tag belongs to another sender", async () => {
    const progress = createElectrsLogProgress({ now: () => 1_000 });

    progress.accept(Buffer.from("<30>Aug 10 06:33:59 host attacker[7]: electrs-progress: History indexing is up to height=12345"));
    progress.accept(Buffer.from("<30>Aug 10 06:33:59 host attacker[7]: payload electrs-progress[999]: History indexing is up to height=23456"));

    await expect(progress.getIndexedHeight()).resolves.toBeNull();
  });

  it("does not revive expired progress when the wall clock moves backward", async () => {
    let wallClock = 10_000;
    let monotonicClock = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => wallClock);
    vi.spyOn(performance, "now").mockImplementation(() => monotonicClock);
    const progress = createElectrsLogProgress({ freshnessMs: 10 });

    progress.accept(Buffer.from("<13> electrs-progress: History indexing is up to height=70000"));
    wallClock += 11;
    monotonicClock += 11;
    await expect(progress.getIndexedHeight()).resolves.toBeNull();

    wallClock -= 11;
    await expect(progress.getIndexedHeight()).resolves.toBeNull();
    vi.restoreAllMocks();
  });

  it("receives a bounded provider marker over the production UDP channel", async () => {
    const progress = createElectrsLogProgress();
    const receiver = await startElectrsLogReceiver({ host: "127.0.0.1", port: 0, progress });
    const sender = createSocket("udp4");
    const address = receiver.address();
    try {
      const received = once(receiver, "message");
      await new Promise<void>((resolve, reject) => {
        sender.send(
          Buffer.from("<27>Aug 10 06:33:59 host electrs-progress[1599]: History indexing is up to height=70000\n"),
          address.port,
          "127.0.0.1",
          (error) => error ? reject(error) : resolve(),
        );
      });
      await received;
      await expect(progress.getIndexedHeight()).resolves.toBe(70_000);
    } finally {
      sender.close();
      receiver.close();
    }
  });
});