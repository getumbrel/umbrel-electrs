import { z } from "zod";

export const indexerStateSchema = z.enum([
  "waiting-for-core",
  "connecting",
  "indexing",
  "ready",
  "degraded",
]);

export const indexerStatusSchema = z.object({
  state: indexerStateSchema,
  version: z.string().nullable(),
  coreHeight: z.number().int().nonnegative().nullable(),
  indexedHeight: z.number().int().nonnegative().nullable(),
  percent: z.number().min(0).max(100).nullable(),
  message: z.string(),
});

export type IndexerStatus = z.infer<typeof indexerStatusSchema>;

export type StatusInputs = {
  coreHeight: number | null;
  indexedHeight: number | null;
  initialBlockDownload: boolean;
  version: string | null;
};

export function deriveIndexerStatus(input: StatusInputs): IndexerStatus {
  if (input.initialBlockDownload) {
    return {
      state: "waiting-for-core",
      version: input.version,
      coreHeight: input.coreHeight,
      indexedHeight: input.indexedHeight,
      percent: null,
      message: "Waiting for Bitcoin Core to finish syncing",
    };
  }

  if (input.indexedHeight === null || input.coreHeight === null) {
    return {
      state: "connecting",
      version: input.version,
      coreHeight: input.coreHeight,
      indexedHeight: input.indexedHeight,
      percent: null,
      message: "Connecting to Electrs",
    };
  }

  const percent = input.coreHeight === 0
    ? (input.indexedHeight === 0 ? 100 : 0)
    : Math.min(100, Math.max(0, Number(((input.indexedHeight / input.coreHeight) * 100).toFixed(2))));
  const ready = input.indexedHeight >= input.coreHeight;

  return {
    state: ready ? "ready" : "indexing",
    version: input.version,
    coreHeight: input.coreHeight,
    indexedHeight: input.indexedHeight,
    percent,
    message: ready ? "Electrs is synchronized" : "Indexing Bitcoin blocks",
  };
}
