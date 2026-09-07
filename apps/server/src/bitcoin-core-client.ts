import { z } from "zod";
import type { BitcoinCoreClient } from "./electrs-gui-service.js";

const blockchainInfoSchema = z.object({
  blocks: z.number().int().nonnegative(),
  initialblockdownload: z.boolean(),
});

const rpcResponseSchema = z.object({
  result: z.unknown().nullable(),
  error: z.unknown().nullable(),
});

export function createBitcoinCoreClient({
  host,
  port,
  username,
  password,
  fetchFn = fetch,
  timeoutMs = 5_000,
}: {
  host: string;
  port: number;
  username: string;
  password: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): BitcoinCoreClient {
  const endpoint = `http://${host}:${port}`;
  const authorization = `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;

  return {
    async getBlockchainInfo() {
      let response: Response;
      try {
        response = await fetchFn(endpoint, {
          method: "POST",
          headers: {
            authorization,
            "content-type": "application/json",
          },
          body: JSON.stringify({ jsonrpc: "1.0", id: "electrs-gui", method: "getblockchaininfo", params: [] }),
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new Error("Bitcoin Core RPC request failed");
      }

      if (!response.ok) {
        throw new Error("Bitcoin Core RPC request failed");
      }

      let parsed: z.infer<typeof rpcResponseSchema>;
      try {
        parsed = rpcResponseSchema.parse(await response.json());
      } catch {
        throw new Error("Bitcoin Core RPC response was invalid");
      }
      if (parsed.error !== null) {
        throw new Error("Bitcoin Core RPC returned an error");
      }
      const result = blockchainInfoSchema.safeParse(parsed.result);
      if (!result.success) {
        throw new Error("Bitcoin Core RPC response was invalid");
      }
      return result.data;
    },
  };
}
