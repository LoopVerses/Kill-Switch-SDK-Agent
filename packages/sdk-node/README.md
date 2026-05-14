<div align="center">

# Agent Kill Switch — Node.js SDK

[![npm version](https://img.shields.io/badge/npm-%40agent--killswitch%2Fsdk--node-0.3.0-CB3837?logo=npm)](https://www.npmjs.com/package/@agent-killswitch/sdk-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/@agent-killswitch/sdk-node?color=339933&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Production-grade TypeScript client for the Agent Kill Switch control plane** — telemetry ingestion, agent lifecycle, kill events, and policy evaluation over HTTPS, with the ergonomics you expect from first-party cloud SDKs.

[Installation](#installation) · [Quick start](#quick-start) · [Core concepts](#core-concepts) · [API reference](#http--resource-mapping) · [Errors](#errors--retries)

</div>

---

> **Looking for the Python control plane or workers?** This package is the **Node.js / TypeScript** runtime SDK for HTTP APIs. Platform services (FastAPI, workers, Go executors) live in the **Agent Kill Switch** monorepo. The public mirror for this SDK is [**Kill-Switch-SDK-Agent**](https://github.com/LoopVerses/Kill-Switch-SDK-Agent).

---

## Why this SDK

The Agent Kill Switch **Node.js SDK** is a **small, strict, dependency-light** client: one main class, **namespaced resources**, **timeouts**, **automatic retries** on transient failures, a versioned **`User-Agent`**, optional **`AbortSignal`** per call, and a **typed error hierarchy** so production code can branch on `401` / `429` / `5xx` without string-matching.

It is **provider-agnostic** at the HTTP boundary: point `baseURL` at your deployment (self-hosted or managed) and authenticate with **API keys** or **Bearer JWTs** as your gateway expects.

---

## Core concepts

| Concept | What you get |
|--------|----------------|
| **`AgentKillSwitch`** | Single entry client (default export). Holds `health`, `telemetry`, `agents`, and `kill` sub-clients. |
| **Resources** | `client.telemetry.sendBatch`, `client.agents.register`, `client.kill.latest`, … — predictable grouping, similar to large cloud SDKs. |
| **Resilience** | Per-request **timeout** (default 60s), **retries** with backoff + **`Retry-After`** on `429`, and retries on `408` / `5xx` / connection errors (configurable). |
| **Typed errors** | `AuthenticationError`, `RateLimitError`, `KillSwitchApiError`, `APIConnectionError`, … — map directly to HTTP and transport failures. |
| **Types** | DTOs re-exported from **`@agent-killswitch/shared-types`** (`KillEventRecord`, `AgentRecord`, …). |

---

## Requirements

- **Node.js** `>= 20.10.0` (uses global `fetch`, `AbortSignal.timeout`, `AbortSignal.any`).
- **ES modules** — `"type": "module"` in your app, or consume the emitted `.js` from a bundler.
- A reachable **Agent Kill Switch API** `baseURL`.

---

## Installation

### npm

```bash
npm install @agent-killswitch/sdk-node
```

### pnpm

```bash
pnpm add @agent-killswitch/sdk-node
```

### yarn

```bash
yarn add @agent-killswitch/sdk-node
```

Runtime dependency **`@agent-killswitch/shared-types`** is installed automatically for shared contracts.

---

## Quick start

Set your API origin and credential (never commit secrets — use env vars or a secret manager):

```bash
export KILLSWITCH_API_URL="https://api.example.com"
export KILLSWITCH_API_KEY="your-api-key"
```

```typescript
import AgentKillSwitch, {
  AuthenticationError,
  KillSwitchApiError,
  RateLimitError,
} from '@agent-killswitch/sdk-node';

const client = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!,
  apiKey: process.env.KILLSWITCH_API_KEY,
});

// Ingest telemetry (batch)
const { accepted } = await client.telemetry.sendBatch([
  { type: 'heartbeat', agentId: 'support-bot-1', emittedAt: new Date().toISOString() },
]);

// Latest kill for an agent external ref (null if none)
const latest = await client.kill.latest('support-bot-1');

// Register an agent if your flow creates them from the runtime
await client.agents.register({ externalRef: 'support-bot-1', name: 'Support bot' });

// Optional: evaluate kill policy via API → kill-core proxy
const decision = await client.kill.evaluate('support-bot-1');
console.log({ accepted, latest, decision });
```

**Default export** equals **`AgentKillSwitch`**:

```typescript
import Client from '@agent-killswitch/sdk-node';

const client = new Client({ baseURL: 'https://api.example.com', apiKey: '…' });
```

### Per-request cancellation

Every resource method accepts an optional trailing **`{ signal }`** (merged with the client timeout):

```typescript
const ac = new AbortController();
setTimeout(() => ac.abort(), 5_000);

await client.telemetry.sendBatch([{ type: 'ping' }], { signal: ac.signal });
```

---

## Client configuration

| Option | Type | Description |
|--------|------|-------------|
| `baseURL` | `string` | API origin (trailing slash optional). |
| `baseUrl` | `string` | Deprecated alias of `baseURL`. |
| `apiKey` | `string` | `X-Api-Key` header (typically preferred when both are set). |
| `bearerToken` | `string` | `Authorization: Bearer …`. |
| `fetch` | `typeof fetch` | Custom fetch (tests, proxies, non-standard runtimes). |
| `fetchImpl` | `typeof fetch` | Deprecated alias of `fetch`. |
| `defaultHeaders` | `Record<string, string>` | Merged on every request (e.g. tracing, signing). |
| `timeout` | `number` | Timeout in **ms** (default `60000`). `0` disables the client-side timeout (still honors `signal`). |
| `maxRetries` | `number` | Extra attempts after the first for retriable HTTP / network errors (default `2`). |

---

## HTTP ↔ resource mapping

| Resource | Method | HTTP |
|----------|--------|------|
| **`client.health`** | `check()` | `GET /healthz` (no auth) |
| **`client.telemetry`** | `sendBatch(events)` | `POST /v1/telemetry/batch` → **202** |
| **`client.agents`** | `list(limit?)` | `GET /agents` |
| | `register({ externalRef, name? })` | `POST /agents` → **201** |
| **`client.kill`** | `latest(externalRef)` | `GET /agents/:externalRef/kill/latest` → **`null`** on **404** |
| | `record(input)` | `POST /kill` → **201** |
| | `evaluate(externalRef)` | `POST /kill/evaluate/:externalRef` → **200** |

Telemetry payloads are **`Record<string, unknown>[]`** so you can align with your server’s ingestion schema without waiting on SDK releases for every field.

---

## Legacy flat API

`KillSwitchClient` is an **alias** of `AgentKillSwitch`. Flat helpers (`getLastKill`, `sendTelemetryBatch`, …) still work and delegate to the nested resources (marked `@deprecated` in JSDoc for IDE hints).

---

## Errors & retries

Non-success HTTP responses become **`KillSwitchApiError`** or a subclass (`AuthenticationError`, `RateLimitError`, …). **`RateLimitError`** exposes **`retryAfterMs`** when `Retry-After` is present. Transport failures use **`APIConnectionError`**; aborts use **`APIUserAbortError`**.

```typescript
try {
  await client.telemetry.sendBatch([]);
} catch (e) {
  if (e instanceof RateLimitError) {
    console.warn('Retry after (ms):', e.retryAfterMs);
  } else if (e instanceof KillSwitchApiError) {
    console.error(e.status, e.code, e.message);
  } else {
    throw e;
  }
}
```

---

## Version & `User-Agent`

The package exports **`VERSION`**. Every request sends:

`User-Agent: AgentKillSwitch-JS/<VERSION>`

Keep **`src/version.ts`** in sync with **`package.json`** `"version"` when you cut releases.

---

## Types

Re-exported from **`@agent-killswitch/shared-types`**: `AgentRecord`, `KillEventRecord`, `TelemetryBatchAccepted`, …

Defined in this package: `AgentKillSwitchOptions`, `RegisterAgentInput`, `RecordKillInput`, `RequestCallOptions`, `ParsedApiError`.

---

## Development (monorepo)

From the repository root (with pnpm workspaces):

```bash
pnpm install
pnpm --filter @agent-killswitch/shared-types build
pnpm --filter @agent-killswitch/sdk-node build
pnpm --filter @agent-killswitch/sdk-node test
```

---

## Security

- Do **not** commit API keys or JWTs.
- Rotate keys on compromise; scope keys to least privilege on the control plane.

---

## Acknowledgements

This SDK builds on **TypeScript**, the **WinterTC / Fetch** APIs available in modern Node.js, and **`@agent-killswitch/shared-types`** for shared DTOs. Thank you to everyone shipping safer agent runtimes behind real APIs.

---

## License

MIT — see [LICENSE](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/blob/main/LICENSE) in the public mirror repository.
