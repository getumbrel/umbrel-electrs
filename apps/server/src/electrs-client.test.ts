// @vitest-environment node
import { createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createElectrsClient } from "./electrs-client.js";

const servers: Server[] = [];
const sockets = new Set<Socket>();
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  server.close((error) => error ? reject(error) : resolve());
}))));

async function fakeElectrs(handler: (request: { method: string; id: number; params: unknown[] }) => unknown): Promise<number> {
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline === -1) return;
      const request = JSON.parse(buffer.slice(0, newline)) as { method: string; id: number; params: unknown[] };
      socket.end(`${JSON.stringify({ id: request.id, jsonrpc: "2.0", result: handler(request) })}\n`);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address");
  return address.port;
}

describe("ElectrsClient", () => {
  it("reads the Electrs version and indexed tip over bounded Electrum JSON-RPC", async () => {
    const port = await fakeElectrs(({ method, params }) => {
      if (method === "server.version") {
        expect(params).toEqual(["umbrel", "1.4"]);
        return ["electrs/0.9.12", "1.4"];
      }
      expect(params).toEqual([]);
      return { height: 110, hex: "00" };
    });
    const client = createElectrsClient({ host: "127.0.0.1", port, timeoutMs: 500 });

    expect(await client.getVersion()).toBe("0.9.12");
    expect(await client.getTip()).toBe(110);
  });

  it("times out instead of leaving a hanging daemon socket", async () => {
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test address");
    const client = createElectrsClient({ host: "127.0.0.1", port: address.port, timeoutMs: 30 });

    await expect(client.getTip()).rejects.toThrow("Electrs request timed out");
  });
});
