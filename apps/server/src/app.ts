import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import type { IndexerStatus } from "../../../packages/contracts/src/status.js";

export interface ElectrsGuiService {
  getStatus(): Promise<IndexerStatus>;
  getConnections(): ConnectionDetails;
  getLegacyVersion(): Promise<string>;
  getLegacySyncPercent(): Promise<number>;
}

export function buildApp({ service, serveUi = true }: { service: ElectrsGuiService; serveUi?: boolean }): FastifyInstance {
  const app = Fastify({
    logger: false,
    bodyLimit: 16 * 1024,
  });

  void app.register(helmet, {
    xFrameOptions: { action: "deny" },
    referrerPolicy: { policy: "no-referrer" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
  });

  app.get("/ping", async () => ({ version: "umbrel-middleware-0.1.12" }));
  app.get("/api/status", async (_request, reply) => {
    try {
      return await service.getStatus();
    } catch {
      return reply.code(503).send({ error: "Electrs status is temporarily unavailable" });
    }
  });
  app.get("/api/connections", async () => service.getConnections());

  app.get("/v1/electrs/version", async (_request, reply) => {
    try {
      const version = await service.getLegacyVersion();
      return reply.type("application/json").send(JSON.stringify(version));
    } catch {
      return reply.code(503).send({ error: "Electrs version is temporarily unavailable" });
    }
  });
  app.get("/v1/electrs/syncPercent", async () => {
    try {
      return await service.getLegacySyncPercent();
    } catch {
      return -2;
    }
  });
  app.get("/v1/electrs/electrum-connection-details", async () => {
    const { local, tor } = service.getConnections();
    return {
      local: { address: local.address, port: local.port, connectionString: local.connectionString },
      tor: { address: tor.address, port: tor.port, connectionString: tor.connectionString },
    };
  });

  if (serveUi) {
    void app.register(fastifyStatic, {
      root: join(process.cwd(), "apps/ui/dist"),
      wildcard: false,
    });
  }

  app.setNotFoundHandler((_request, reply) => reply.code(404).send());

  return app;
}
