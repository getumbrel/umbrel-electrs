import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard.js";

const connections = {
  local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" as const },
  tor: { address: "example.onion", port: 50001, connectionString: "example.onion:50001", transport: "tcp" as const }
};

describe("Dashboard", () => {
  it("renders the compact Node-style header and keeps connection details in the Connect dialog", async () => {
    render(<Dashboard status={{ state: "ready", version: "0.9.12", coreHeight: 110, indexedHeight: 110, percent: 100, message: "Electrs is synchronized" }} connections={connections} />);
    expect(screen.getByRole("heading", { name: "Electrs (BTC)" })).toBeInTheDocument();
    expect(screen.getByText("Electrs 0.9.12")).toBeInTheDocument();
    expect(screen.queryByText("umbrel.local")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByRole("dialog", { name: "Connect to Electrs" })).toBeInTheDocument();
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
  });

  it("shows a privacy-safe unavailable state without disabling the Connect dialog", async () => {
    render(<Dashboard status={{ state: "degraded", version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Bitcoin Core is unavailable" }} connections={connections} />);
    expect(screen.getByText("Bitcoin Core is unavailable")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("umbrel.local")).toBeInTheDocument();
  });
});
