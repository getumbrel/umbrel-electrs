# Electrs for Bitcoin — Umbrel GUI

A modern, independently maintainable Bitcoin Electrs status and wallet-connection interface for Umbrel, based on `getumbrel/umbrel-electrs` v1.0.4.

## Product contract

The implementation preserves the official `getumbrel/umbrel-electrs` v1.0.4 facade contract while adding a typed modern API:

- GUI listener: `3006`;
- private Electrs Electrum TCP listener: `50001`;
- official wallet-facing Local/Tor port: `50001`;
- legacy routes: `/ping`, `/v1/electrs/version`, `/v1/electrs/syncPercent`, and `/v1/electrs/electrum-connection-details`;
- modern routes: `/api/status` and `/api/connections`;
- environment: `PORT`, `ELECTRS_HOST`, `ELECTRS_PORT`, `BITCOIN_HOST`, `RPC_PORT`, `RPC_USER`, `RPC_PASSWORD`, `ELECTRUM_PORT`, `ELECTRUM_LOCAL_SERVICE`, and `ELECTRUM_HIDDEN_SERVICE`.

The insecure inherited RPC-password fallback is intentionally removed: `RPC_PASSWORD` must be injected at runtime. The UI defaults to Local, matching the official Bitcoin GUI.

## Daemon decision

The local Compose fixture retains the original Bitcoin daemon lineage: `getumbrel/electrs:v0.11.1` pinned to the exact digest currently used by the official Umbrel package. `romanz/electrs` v0.11.1 was released on 2026-02-22 and is the current upstream release; it is newer and more appropriate for Bitcoin than the Litecoin-specific maintained fork used by the architecture reference. This GUI does not fork or rebuild the daemon.

## Interface

- React 19, TypeScript, Vite, Fastify, Zod, Radix primitives, and TanStack Query;
- provider-driven waiting, connecting, indexing, synchronized, and degraded states;
- exactly six fixed index blocks;
- independent progress, pulse, and completion layers;
- Bitcoin-orange semantic actions and progress while retaining the official Electrs product icon;
- accessible Local/Tor details, exact `host:port` clipboard values, and locally generated QR codes;
- no telemetry and no logging of request paths, RPC payloads, wallet data, daemon responses, or credentials.

Indexing motion is provider-state driven: a 2.4s `ease-in-out` traveling pulse, 120ms per-block stagger, peak scale 1.055, and brightness 1.65. Completion uses a symmetric 220ms `ease-out` crossfade. Reduced motion hard-disables animation, transform, and filter.

## Development

Requires Node.js 24 LTS and npm 12 for the supported toolchain.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm audit
npm run audit:production
npm run build
docker compose config -q
docker build -t umbrel-bitcoin-electrs-gui:candidate .
```

The production image uses digest-pinned build and Distroless Node runtimes, installs production dependencies only, runs as `1000:1000`, and exposes only `3006`.

## License

This modernization retains the inherited PolyForm Noncommercial License 1.0.0 and historical grant. See `LICENSE.md`, `LICENSE.legacy`, and `THIRD_PARTY_NOTICES.md`.
