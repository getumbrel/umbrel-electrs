import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { ElectrsGuiService } from "./app.js";
import type { ElectrsMetricsClient } from "./electrs-metrics-client.js";

export interface BitcoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
}

export interface ElectrsClient {
  getTip(): Promise<number>;
  getVersion(): Promise<string>;
}

function isInitialIndexingProgress(indexedHeight: number | null | undefined, coreHeight: number): indexedHeight is number {
  return indexedHeight !== null && indexedHeight !== undefined && indexedHeight < coreHeight;
}

export function createElectrsGuiService({
  core,
  electrs,
  progress,
  connections,
}: {
  core: BitcoinCoreClient;
  electrs: ElectrsClient;
  progress?: ElectrsMetricsClient;
  connections: ConnectionDetails;
}): ElectrsGuiService {
  return {
    getConnections: () => connections,
    getLegacyVersion: () => electrs.getVersion(),
    async getLegacySyncPercent() {
      try {
        const coreInfo = await core.getBlockchainInfo();
        await electrs.getVersion();
        const indexedHeight = await electrs.getTip();
        return (indexedHeight / coreInfo.blocks) * 100;
      } catch {
        const coreInfo = await core.getBlockchainInfo().catch(() => null);
        if (!coreInfo) return -2;
        const indexedHeight = await progress?.getIndexedHeight().catch(() => null);
        if (isInitialIndexingProgress(indexedHeight, coreInfo.blocks)) {
          return (indexedHeight / coreInfo.blocks) * 100;
        }
        return coreInfo.initialblockdownload ? -1 : -2;
      }
    },
    async getStatus(): Promise<IndexerStatus> {
      let coreInfo: { blocks: number; initialblockdownload: boolean };
      try {
        coreInfo = await core.getBlockchainInfo();
      } catch {
        return {
          state: "degraded",
          version: null,
          coreHeight: null,
          indexedHeight: null,
          percent: null,
          message: "Bitcoin Core is unavailable",
        };
      }

      try {
        const [indexedHeight, version] = await Promise.all([
          electrs.getTip(),
          Promise.resolve().then(() => electrs.getVersion()).catch(() => null),
        ]);
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight,
          initialBlockDownload: false,
          version,
        });
      } catch {
        const indexedHeight = await progress?.getIndexedHeight().catch(() => null) ?? null;
        const hasProgress = isInitialIndexingProgress(indexedHeight, coreInfo.blocks);
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight: hasProgress ? indexedHeight : null,
          initialBlockDownload: coreInfo.initialblockdownload && !hasProgress,
          version: null,
        });
      }
    },
  };
}
