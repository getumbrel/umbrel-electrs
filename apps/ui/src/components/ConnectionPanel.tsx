import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { Check, Copy, WalletCards, X } from "lucide-react";
import { useState } from "react";
import type { Connection, ConnectionDetails } from "@contracts/connections";
import { copyText } from "../clipboard.js";
import { ConnectionQr } from "./QrCodeDialog.js";

function CopyRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  const [feedback, setFeedback] = useState<"" | "Copied!" | "Copy failed">("");

  async function copy() {
    const copied = await copyText(value);
    setFeedback(copied ? "Copied!" : "Copy failed");
    window.setTimeout(() => setFeedback(""), 900);
  }

  return (
    <div className="connection-row">
      <span className="row-label">{label}</span>
      <span className="row-value" title={value}>{value}</span>
      <span className={`copy-popover${feedback ? " is-visible" : ""}`} aria-live="polite">{feedback}</span>
      <button type="button" onClick={copy} aria-label={copyLabel} className="row-copy">
        {feedback === "Copied!" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
    </div>
  );
}

function StaticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="connection-row">
      <span className="row-label">{label}</span>
      <span className="row-value">{value}</span>
    </div>
  );
}

function ConnectionBody({ connection, network }: { connection: Connection; network: "local" | "tor" }) {
  return (
    <>
      <div className="connection-modal-grid">
        <div className="connection-type-card">
          <p>Connection Type</p>
          <Tabs.List aria-label="Connection network" className="connection-tabs">
            <Tabs.Trigger value="local">Local</Tabs.Trigger>
            <Tabs.Trigger value="tor">Tor</Tabs.Trigger>
          </Tabs.List>
          <ConnectionQr key={connection.connectionString} value={connection.connectionString} />
        </div>
        <div className="connection-details-column">
          <div className="connection-field-group">
            <CopyRow label="Address" value={connection.address} copyLabel="Copy address" />
            <CopyRow label="Port" value={String(connection.port)} copyLabel="Copy port" />
            <CopyRow label="Connection string" value={connection.connectionString} copyLabel="Copy connection string" />
            <StaticRow label="SSL" value="None" />
          </div>
          <p className="network-note">
            {network === "tor"
              ? "Use this Tor address when connecting from outside your local network."
              : "Use this address only from devices on your local network."}
          </p>
        </div>
      </div>
    </>
  );
}

export function ConnectionPanel({ details }: { details: ConnectionDetails }) {
  const [network, setNetwork] = useState<"local" | "tor">("local");
  const connection = details[network];

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="connect-button">
          <span className="gradient-border" aria-hidden="true" />
          <WalletCards aria-hidden="true" />
          <span>Connect</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="connection-dialog">
          <span className="gradient-border" aria-hidden="true" />
          <div className="connection-dialog-scroll">
          <div className="dialog-header">
            <Dialog.Title><WalletCards aria-hidden="true" /> Connect to Electrs</Dialog.Title>
            <Dialog.Description>
              Connect Electrum-BTC or another compatible wallet to your own private Bitcoin indexer.
            </Dialog.Description>
          </div>

          <Tabs.Root value={network} onValueChange={(value) => setNetwork(value as "local" | "tor")}>
            <ConnectionBody connection={connection} network={network} />
          </Tabs.Root>
          </div>

          <Dialog.Close asChild>
            <button type="button" className="dialog-close" aria-label="Close connection details"><X aria-hidden="true" /></button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
