import { createSocket, type Socket } from "node:dgram";
import { performance } from "node:perf_hooks";

const DEFAULT_FRESHNESS_MS = 30 * 60 * 1_000;
const DEFAULT_MAX_DATAGRAM_BYTES = 16 * 1024;
const indexedHeightPattern = /^<\d{1,3}>(?:(?:[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+)|\s*)electrs-progress(?:\[\d+\])?:[^\r\n]*\b(?:Tx|History) indexing is up to height=(\d+)\s*$/;

export interface ElectrsProgress {
  getIndexedHeight(): Promise<number | null>;
}

export interface ElectrsLogProgress extends ElectrsProgress {
  accept(datagram: Buffer): void;
}

export function createElectrsLogProgress({
  now = () => performance.now(),
  freshnessMs = DEFAULT_FRESHNESS_MS,
  maxDatagramBytes = DEFAULT_MAX_DATAGRAM_BYTES,
}: {
  now?: () => number;
  freshnessMs?: number;
  maxDatagramBytes?: number;
} = {}): ElectrsLogProgress {
  let indexedHeight: number | null = null;
  let receivedAt = 0;

  return {
    accept(datagram) {
      if (datagram.length === 0 || datagram.length > maxDatagramBytes) return;
      const match = indexedHeightPattern.exec(datagram.toString("utf8"));
      if (!match) return;
      const height = Number(match[1]);
      if (!Number.isSafeInteger(height) || height < 0) return;
      indexedHeight = height;
      receivedAt = now();
    },
    async getIndexedHeight() {
      if (indexedHeight === null || now() - receivedAt > freshnessMs) return null;
      return indexedHeight;
    },
  };
}

export async function startElectrsLogReceiver({
  host,
  port,
  progress,
}: {
  host: string;
  port: number;
  progress: ElectrsLogProgress;
}): Promise<Socket> {
  const socket = createSocket("udp4");
  socket.on("message", (datagram) => progress.accept(datagram));
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      socket.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      socket.off("error", onError);
      resolve();
    };
    socket.once("error", onError);
    socket.once("listening", onListening);
    socket.bind(port, host);
  });
  socket.on("error", () => undefined);
  return socket;
}
