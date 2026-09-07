import type { ConnectionDetails } from "@contracts/connections";
import type { IndexerStatus } from "@contracts/status";
import { ConnectionPanel } from "./ConnectionPanel.js";
import { StatusHero } from "./StatusHero.js";

export function Dashboard({ status, connections }: { status: IndexerStatus; connections: ConnectionDetails }) {
  return (
    <main className="node-shell">
      <div className="node-column">
        <header className="node-header">
          <div className="node-identity">
            <img src="/icon.png" alt="Electrs (BTC) logo" className="node-logo" />
            <div>
              <h1>Electrs (BTC)</h1>
              <p>{status.version ? `Electrs ${status.version}` : "Electrs"}</p>
            </div>
          </div>
          <ConnectionPanel details={connections} />
        </header>
        <StatusHero status={status} />
      </div>
    </main>
  );
}
