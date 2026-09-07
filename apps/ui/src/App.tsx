import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import type { IndexerStatus } from "@contracts/status";
import { fetchConnections, fetchStatus } from "./api.js";
import { Dashboard } from "./components/Dashboard.js";

const unavailableStatus: IndexerStatus = {
  state: "degraded",
  version: null,
  coreHeight: null,
  indexedHeight: null,
  percent: null,
  message: "Electrs status is temporarily unavailable",
};

function LoadingScreen() {
  return (
    <main className="app-shell loading-screen" aria-label="Loading Electrs">
      <div className="loading-content">
        <div className="loading-mark"><img src="/icon.png" alt="" /></div>
        <p>Connecting to Electrs</p>
        <div className="loading-line"><span /></div>
      </div>
    </main>
  );
}

function ErrorScreen() {
  const queryClient = useQueryClient();
  return (
    <main className="app-shell error-screen">
      <div className="error-card">
        <img src="/icon.png" alt="" className="error-icon" />
        <p className="eyebrow">Connection interrupted</p>
        <h1>Electrs is taking longer than expected</h1>
        <p>The interface could not load connection details. Electrs may still be starting.</p>
        <button type="button" className="primary-button" onClick={() => void queryClient.invalidateQueries()}>
          <RefreshCw aria-hidden="true" /> Try again
        </button>
      </div>
    </main>
  );
}

function DashboardQuery() {
  const status = useQuery({
    queryKey: ["status"],
    queryFn: () => fetchStatus(),
    retry: 1,
    retryDelay: 250,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  const connections = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetchConnections(),
    retry: 1,
    retryDelay: 250,
    staleTime: 60_000,
  });

  if (connections.isPending || status.isPending) return <LoadingScreen />;
  if (connections.isError || !connections.data) return <ErrorScreen />;
  return <Dashboard status={status.data ?? unavailableStatus} connections={connections.data} />;
}

function FrameBlocked() {
  return (
    <main className="app-shell error-screen">
      <div className="error-card">
        <img src="/icon.png" alt="" className="error-icon" />
        <h1>Open Electrs in its own window</h1>
        <p>For security, this interface cannot be embedded in another page.</p>
      </div>
    </main>
  );
}

export function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: true } },
  }));
  const framed = typeof window !== "undefined" && window.self !== window.top;

  return <QueryClientProvider client={queryClient}>{framed ? <FrameBlocked /> : <DashboardQuery />}</QueryClientProvider>;
}
