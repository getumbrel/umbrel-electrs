import { connectionDetailsSchema, type ConnectionDetails } from "@contracts/connections";
import { indexerStatusSchema, type IndexerStatus } from "@contracts/status";

async function request(path: string, fetchFn: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchFn(path, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
  } catch {
    throw new Error("Electrs is temporarily unavailable");
  }
  if (!response.ok) throw new Error("Electrs is temporarily unavailable");
  try {
    return await response.json();
  } catch {
    throw new Error("Electrs returned an invalid response");
  }
}

export async function fetchStatus(fetchFn: typeof fetch = fetch): Promise<IndexerStatus> {
  const result = indexerStatusSchema.safeParse(await request("/api/status", fetchFn));
  if (!result.success) throw new Error("Electrs returned an invalid status response");
  return result.data;
}

export async function fetchConnections(fetchFn: typeof fetch = fetch): Promise<ConnectionDetails> {
  const result = connectionDetailsSchema.safeParse(await request("/api/connections", fetchFn));
  if (!result.success) throw new Error("Electrs returned an invalid connection response");
  return result.data;
}
