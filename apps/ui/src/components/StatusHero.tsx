import type { CSSProperties } from "react";
import type { IndexerStatus } from "@contracts/status";

const runtimeLabels: Record<IndexerStatus["state"], string> = {
  "waiting-for-core": "Waiting for Bitcoin Core",
  connecting: "Connecting",
  indexing: "Running",
  ready: "Running",
  degraded: "Not running",
};

const accessibleLabels: Record<IndexerStatus["state"], string> = {
  "waiting-for-core": "Electrs is waiting for Bitcoin Core",
  connecting: "Electrs is connecting",
  indexing: "Electrs is indexing",
  ready: "Electrs is running",
  degraded: "Electrs is not running",
};

function formatHeight(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

export function StatusHero({ status }: { status: IndexerStatus }) {
  const progress = Math.max(0, Math.min(status.percent ?? 0, 100));
  const indexedBlocks = status.state === "ready" ? 6 : Math.floor((progress / 100) * 6);
  const synchronized = status.state === "ready";
  const syncTitle = synchronized ? "Synchronized" : status.state === "indexing" ? "Synchronizing" : runtimeLabels[status.state];
  const artStateClass = status.state === "indexing" ? " is-syncing" : synchronized ? " is-complete" : "";

  return (
    <section className="status-card" aria-label="Electrs status">
      <span className="gradient-border" aria-hidden="true" />
      <div className="status-card-content">
        <div className="status-visual">
          <span className="corner-border" aria-hidden="true" />
          <div className={`runtime-state state-${status.state}`} role="status" aria-label={accessibleLabels[status.state]} aria-live="polite">
            <span className="runtime-dot" aria-hidden="true"><span /></span>
            <span>{runtimeLabels[status.state]}</span>
          </div>

          <div className={`index-art${artStateClass}`} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span
                className={`index-block${index < indexedBlocks ? " is-indexed" : ""}`}
                key={index}
                style={{ "--pulse-index": index } as CSSProperties}
              >
                <span className="index-block-complete" />
                <span className="index-block-pulse-fade"><span className="index-block-pulse" /></span>
              </span>
            ))}
          </div>

          <div className="sync-copy">
            <p>{status.message}</p>
            <div className="sync-title-row">
              <h2>{syncTitle}</h2>
              {status.percent !== null && <span>{Math.floor(status.percent)}%</span>}
            </div>
            <div
              className="node-progress"
              role="progressbar"
              aria-label="Electrs synchronization progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={status.percent ?? undefined}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <aside className="index-summary" aria-label="Indexer heights">
          <div>
            <p>Indexed height</p>
            <strong>{formatHeight(status.indexedHeight)}</strong>
            <span>blocks indexed</span>
          </div>
          <div className="summary-divider" />
          <div>
            <p>Bitcoin Core</p>
            <strong>{formatHeight(status.coreHeight)}</strong>
            <span>current height</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
