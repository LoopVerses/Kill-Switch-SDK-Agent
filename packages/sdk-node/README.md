<div align="center">

<img src="https://img.shields.io/badge/Agent%20Kill%20Switch-Node.js%20SDK-ffffff?style=for-the-badge&labelColor=0ea5e9&logo=typescript&logoColor=ffffff" alt="Agent Kill Switch · Node.js SDK" height="36" />

# `@agent-killswitch/sdk-node`

### The enterprise TypeScript client for the Agent Kill Switch control plane.

**Telemetry · agent registry · kill decisions · policy evaluation** — over HTTPS with resource-oriented APIs, automatic resilience, typed errors, lifecycle hooks, optional HMAC request signing, and first-class cancellation. Engineered for teams that ship governed autonomous AI to production.

[![npm version](https://img.shields.io/npm/v/%40agent-killswitch%2Fsdk-node?style=flat-square&color=cb3837&logo=npm&logoColor=ffffff&labelColor=ffffff)](https://www.npmjs.com/package/@agent-killswitch/sdk-node)
[![npm downloads](https://img.shields.io/npm/dm/%40agent-killswitch%2Fsdk-node?style=flat-square&color=22c55e&logo=npm&logoColor=ffffff&labelColor=ffffff)](https://www.npmjs.com/package/@agent-killswitch/sdk-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-eab308?style=flat-square&labelColor=ffffff)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/@agent-killswitch/sdk-node?style=flat-square&color=339933&logo=node.js&logoColor=ffffff&labelColor=ffffff)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6?style=flat-square&logo=typescript&logoColor=ffffff&labelColor=ffffff)](https://www.typescriptlang.org/)
[![ESM only](https://img.shields.io/badge/ESM-only-7c3aed?style=flat-square&labelColor=ffffff)](https://nodejs.org/api/esm.html)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/%40agent-killswitch%2Fsdk-node?style=flat-square&label=bundle&color=2dd4bf&labelColor=ffffff)](https://bundlephobia.com/package/@agent-killswitch/sdk-node)
[![Treeshakeable](https://img.shields.io/badge/sideEffects-false-22c55e?style=flat-square&labelColor=ffffff)](#package-shape)
[![Zero runtime deps](https://img.shields.io/badge/runtime%20deps-0-22c55e?style=flat-square&labelColor=ffffff)](#package-shape)

[![CI](https://img.shields.io/github/actions/workflow/status/LoopVerses/Kill-Switch-SDK-Agent/ci.yml?branch=main&style=flat-square&label=CI&logo=github&logoColor=000000&labelColor=ffffff)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/actions)
[![Signed releases](https://img.shields.io/badge/releases-Sigstore%20signed-7c3aed?style=flat-square&logo=sigstore&logoColor=000000&labelColor=ffffff)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/releases)
[![Conformance](https://img.shields.io/badge/Specs-OpenAPI%20%E2%97%84%20Shared%20Types-0ea5e9?style=flat-square&labelColor=ffffff)](#typescript-first-dtos)

---

[**Install**](#installation) ·
[**Quick start**](#quick-start) ·
[**API reference**](#complete-api-reference) ·
[**Advanced**](#advanced-topics) ·
[**Examples**](#real-world-recipes) ·
[**Errors**](#error-reference) ·
[**Security**](#security-model) ·
[**Migration**](#migration-guide) ·
[**FAQ**](#faq)

</div>

---

> [!NOTE]
> This package is the **official Node.js / TypeScript HTTP client** for the Agent Kill Switch **control plane APIs**. The broader platform (FastAPI services, Go executors, policy engines, operator dashboards) ships separately. Public source mirror: **[LoopVerses/Kill-Switch-SDK-Agent](https://github.com/LoopVerses/Kill-Switch-SDK-Agent)**.

## At a glance

```typescript
import AgentKillSwitch from "@agent-killswitch/sdk-node";

const ks = new AgentKillSwitch({
  baseURL: "https://api.yourcompany.com",
  apiKey: process.env.KILLSWITCH_API_KEY,
  timeout: 60_000,
  maxRetries: 2,
});

// 1) Stream telemetry → enables anomaly scoring + audit.
await ks.telemetry.sendBatch([
  {
    type: "tool_call",
    agentId: "support-bot-1",
    emittedAt: new Date().toISOString(),
  },
]);

// 2) Pre-action gate → "should this agent still be allowed to act?"
const latest = await ks.kill.latest("support-bot-1");
if (latest) throw new Error(`Agent killed: ${latest.reason}`);

// 3) Record a kill with idempotency baked in.
await ks.kill.record({
  agentExternalRef: "support-bot-1",
  reason: "tool_misuse_threshold_exceeded",
  correlationId: "incident-2026-05-14-001",
});
```

That's the whole shape: **resource-oriented**, **typed**, **resilient**, **boring in the best way**.

---

## Table of contents

1. [What's new in 0.4](#whats-new-in-04)
2. [Highlights](#highlights)
3. [Why this SDK](#why-this-sdk)
4. [Feature matrix](#feature-matrix)
5. [Installation](#installation)
6. [Quick start](#quick-start)
7. [Authentication](#authentication)
8. [Client configuration](#client-configuration)
9. [Complete API reference](#complete-api-reference)
10. [Advanced topics](#advanced-topics)
    - [Idempotency](#idempotency)
    - [Retries & backoff](#retries--backoff)
    - [Cancellation & deadlines](#cancellation--deadlines)
    - [Lifecycle hooks](#lifecycle-hooks)
    - [Pluggable logger](#pluggable-logger)
    - [HMAC request signing](#hmac-request-signing)
    - [OpenTelemetry](#opentelemetry)
    - [Custom `fetch` (proxies, mTLS, edge)](#custom-fetch-proxies-mtls-edge)
    - [Per-call overrides](#per-call-overrides)
11. [Runtime compatibility](#runtime-compatibility)
12. [Security model](#security-model)
13. [Real-world recipes](#real-world-recipes)
14. [Error reference](#error-reference)
15. [Package shape](#package-shape)
16. [Development & testing](#development--testing)
17. [Versioning & releases](#versioning--releases)
18. [Migration guide](#migration-guide)
19. [FAQ](#faq)
20. [Support](#support)
21. [License](#license)

---

## What's new in 0.4

| Area                           | Change                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Idempotency**                | `Kill.record` auto-derives an `Idempotency-Key` from `correlationId`; explicit keys override at call-site or DTO.  |
| **Per-call headers / timeout** | `RequestCallOptions` now accepts `headers`, `timeout`, `idempotencyKey`, and `requestId`.                          |
| **Lifecycle hooks**            | `onRequest`, `onResponse`, `onRetry` — async, run in order, ideal for tracing and audit.                           |
| **Pluggable logger**           | Drop-in `Logger` interface (matches `console` / `pino` / `winston`); the SDK emits retry and connection events.    |
| **HMAC request signing**       | Optional `signing: { keyId, secret }` matches `kill-core`'s opt-in HMAC mode — uses Web Crypto, no polyfills.      |
| **`X-Request-Id`**             | Every call gets a UUID, propagated in headers and hook context for log/trace stitching.                            |
| **`Retry-After` HTTP-date**    | Both numeric seconds and HTTP-date are now honoured in retry backoff (previously: only RateLimitError carried it). |
| **Timeout errors**             | `AbortSignal.timeout`'s `TimeoutError` is now classified correctly as `APIUserAbortError`.                         |
| **Construction validation**    | Invalid `timeout` or `maxRetries` throw `KillSwitchError` at construction time instead of at first call.           |
| **Empty batch guard**          | `telemetry.sendBatch([])` throws locally instead of dialling the network.                                          |
| **Factory helper**             | `createKillSwitchClient(opts)` reads naturally in DI containers and functional code.                               |

See **[CHANGELOG.md](./CHANGELOG.md)** for the full history.

---

## Highlights

<table>
<tr>
<td width="50%" valign="top">

**🧱 Resource-oriented**
Predictable `client.{telemetry,agents,kill,health}` surface modelled after hyperscaler SDKs.

**⚡️ Resilient transport**
Capped exponential backoff **with jitter**, retries on 408/429/5xx and connection errors, `Retry-After` honoured (seconds **and** HTTP-date).

**🪪 Deterministic errors**
Subclassed errors for 401 / 403 / 404 / 400 / 422 / 429 / 5xx + connection + abort. Branch by `instanceof`, not by string matching.

**🛡 Transport hardening**
HTTPS-by-default, header-injection guards (CR / LF / NUL), no userinfo in base URL, path sanitization, secret redaction in error surfaces.

</td>
<td width="50%" valign="top">

**🧬 First-class observability**
`X-Request-Id` on every call, lifecycle hooks for tracing, pluggable logger, `User-Agent` versioned for gateway segmentation.

**🔑 Idempotency built in**
Auto-derived idempotency keys for kill records; explicit keys win at call-site. Safe to retry without duplicating effects.

**✍️ HMAC request signing**
Optional Sigstore-grade HMAC-SHA256 signing (matches `kill-core` opt-in mode). Uses Web Crypto — zero polyfills, runs everywhere.

**🌐 Runs anywhere**
Node 20+, Cloudflare Workers, Deno, Bun, AWS Lambda. ESM-only, **zero runtime dependencies** beyond shared types.

</td>
</tr>
</table>

---

## Why this SDK

> _"The control plane is two `fetch` calls — why a whole SDK?"_

Because **every minute you don't think about transport is a minute you can spend on policy**. Compare:

<table>
<tr>
<td valign="top">

**Hand-rolled `fetch`**

```typescript
const r = await fetch(`${BASE}/kill`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": process.env.KEY!,
  },
  body: JSON.stringify({
    agentExternalRef: id,
    reason,
  }),
});
if (r.status === 429) {
  /* …backoff?… */
}
if (r.status === 401) {
  /* …rotate?… */
}
if (!r.ok) {
  /* …parse?… */
}
const body = await r.json();
// retries? idempotency? timeout?
// trace propagation? signing?
// CR/LF header injection?
```

</td>
<td valign="top">

**`@agent-killswitch/sdk-node`**

```typescript
await ks.kill.record({
  agentExternalRef: id,
  reason,
  correlationId: traceId,
});
// ✓ retries with jittered backoff
// ✓ Retry-After (seconds + HTTP-date)
// ✓ typed errors per HTTP class
// ✓ auto Idempotency-Key
// ✓ X-Request-Id stitching
// ✓ hook into trace/metrics/audit
// ✓ HMAC signing if configured
// ✓ secret-safe error surfaces
// ✓ user-cancel + client timeout
```

</td>
</tr>
</table>

The SDK is **opinionated where opinions are load-bearing**, **transparent where they aren't**.

---

## Feature matrix

| Area                                | Status     | Notes                                                                                              |
| ----------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| TypeScript-first DTOs               | ✅         | Re-exported from `@agent-killswitch/shared-types` — single source of truth shared with the server. |
| ESM build                           | ✅         | `"type": "module"`; stable subpath exports; works in modern bundlers.                              |
| Resource-oriented client            | ✅         | `client.{telemetry,agents,kill,health}` plus stable legacy flat methods (deprecated).              |
| Auto-retry (idempotent paths)       | ✅         | 408 / 429 / 500–504 + connection errors, capped exponential backoff with jitter.                   |
| `Retry-After` (seconds + HTTP-date) | ✅         | Honoured in both retry backoff and `RateLimitError.retryAfterMs`.                                  |
| Custom `fetch` injection            | ✅         | Drop-in proxy, mTLS via undici dispatcher, SOCKS, edge runtimes.                                   |
| `AbortSignal` everywhere            | ✅         | Per-call `signal?`; client `timeout` composes via `AbortSignal.any`; per-call `timeout` override.  |
| Idempotency-Key                     | ✅         | Auto-derived on `kill.record` from `correlationId`; per-call `idempotencyKey` overrides.           |
| `X-Request-Id` propagation          | ✅         | UUID per call, also surfaced in hook context.                                                      |
| Lifecycle hooks                     | ✅         | `onRequest`, `onResponse`, `onRetry` (async, ordered).                                             |
| Pluggable logger                    | ✅         | `console` / `pino` / `winston` compatible.                                                         |
| HMAC request signing                | ✅         | Optional. HMAC-SHA256 over canonical request string. Uses Web Crypto.                              |
| Typed errors                        | ✅         | Subclass tree rooted at `KillSwitchError`; `KillSwitchApiError.fromResponse` for ad-hoc use.       |
| Secret redaction in error surfaces  | ✅         | Bearer / Basic tokens, `sk_*` / `ks_*` keys, JWT-shaped blobs.                                     |
| OpenTelemetry-friendly              | ✅         | Propagate via `defaultHeaders` or per-call `headers`; works with any OTel-instrumented `fetch`.    |
| Browser support                     | ⚠          | Functional but **never** put server API keys in the browser — use a BFF.                           |
| Streaming response helpers          | 🔭 planned | SSE / NDJSON helpers for live signals (track repo issues).                                         |
| Pagination cursor helpers           | 🔭 planned | Async iterator wrapper on `agents.list` once server cursors land.                                  |

---

## Installation

```bash
npm install @agent-killswitch/sdk-node
# or
pnpm add @agent-killswitch/sdk-node
# or
yarn add @agent-killswitch/sdk-node
# or
bun add @agent-killswitch/sdk-node
# or (Deno)
deno add npm:@agent-killswitch/sdk-node
```

**Peer contract:** `@agent-killswitch/shared-types` is a runtime dependency and is installed automatically. The SDK re-exports the DTOs you need.

> [!IMPORTANT]
> The SDK requires **Node.js ≥ 20.10** (or any runtime with global `fetch`, `AbortSignal.timeout`, and `AbortSignal.any`). Node 18 is not supported — see [Runtime compatibility](#runtime-compatibility).

---

## Quick start

### 1. Configure secrets via environment

```bash
export KILLSWITCH_API_URL="https://api.yourcompany.com"
export KILLSWITCH_API_KEY="ks_live_…"
```

### 2. Instantiate the client

```typescript
import AgentKillSwitch, {
  AuthenticationError,
  RateLimitError,
  APIConnectionError,
} from "@agent-killswitch/sdk-node";

const ks = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!,
  apiKey: process.env.KILLSWITCH_API_KEY,
  timeout: 60_000,
  maxRetries: 2,
});
```

### 3. Use it

```typescript
// Ingest telemetry
const { accepted } = await ks.telemetry.sendBatch([
  {
    type: "tool_call",
    agentId: "support-bot-1",
    emittedAt: new Date().toISOString(),
    payload: { tool: "web_search" },
  },
]);

// Pre-action gate
const latest = await ks.kill.latest("support-bot-1");
if (latest) console.warn("Agent killed:", latest.reason, latest.decidedAt);

// Register a new agent
await ks.agents.register({
  externalRef: "support-bot-1",
  name: "Tier-1 support",
});

// Record a kill (idempotency key auto-derived from correlationId)
await ks.kill.record({
  agentExternalRef: "support-bot-1",
  reason: "tool_misuse_threshold_exceeded",
  correlationId: "incident-2026-05-14-001",
});
```

### 4. Cancel with deadlines

```typescript
await ks.telemetry.sendBatch([{ type: "ping", agentId: "a1" }], {
  signal: AbortSignal.timeout(2_000),
});
```

`createKillSwitchClient(opts)` is an equivalent factory if you prefer functional construction.

---

## Authentication

| Mechanism                                   | SDK option            | HTTP behaviour                                                                    |
| ------------------------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| **API key** (DB-backed, opaque, or key JWT) | `apiKey: string`      | Sets **`X-Api-Key`**. Typically evaluated **before** bearer tokens on the server. |
| **User or machine JWT**                     | `bearerToken: string` | Sets **`Authorization: Bearer …`**.                                               |

**Guidance**

- Prefer **one** primary mechanism per integration to simplify auditing.
- For multi-tenant SaaS, issue **per-tenant keys** with the smallest scope your API supports.
- Step-up auth (FIDO2) is enforced **server-side** for sensitive verbs — the SDK only carries the bearer.
- Rotate keys on compromise; use a secrets manager in production. Recreate the client when the secret changes — the SDK does **not** refresh tokens.

---

## Client configuration

| Option                         | Type                     | Default            | Description                                                                                     |
| ------------------------------ | ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| `baseURL`                      | `string`                 | —                  | **Required.** Origin of the API, e.g. `https://api.example.com`. Trailing slash is stripped.    |
| `baseUrl`                      | `string`                 | —                  | Deprecated alias of **`baseURL`**.                                                              |
| `apiKey`                       | `string`                 | —                  | API key credential.                                                                             |
| `bearerToken`                  | `string`                 | —                  | Bearer JWT or compatible token.                                                                 |
| `fetch`                        | `typeof fetch`           | `globalThis.fetch` | Custom fetch (tests, proxies, non-Node runtimes wrapped with `fetch` semantics).                |
| `defaultHeaders`               | `Record<string, string>` | `{}`               | Extra headers on **every** request. Sanitized for CR / LF / NUL.                                |
| `timeout`                      | `number`                 | `60000`            | Client-side per-request timeout (**ms**). Use **`0`** to disable (still respects **`signal`**). |
| `maxRetries`                   | `number`                 | `2`                | **Additional** attempts after the first for retriable HTTP statuses and connection errors.      |
| `dangerouslyAllowInsecureHttp` | `boolean`                | `false`            | If **`true`**, allows **`http://`** `baseURL` (local dev only). **Never** enable in production. |
| `hooks`                        | `Hooks`                  | —                  | `{ onRequest?, onResponse?, onRetry? }` — see [Lifecycle hooks](#lifecycle-hooks).              |
| `logger`                       | `Logger`                 | `NoopLogger`       | `console` / `pino` / `winston`-compatible. The SDK never logs bodies or credentials.            |
| `signing`                      | `SigningConfig`          | —                  | `{ keyId, secret }` — enables HMAC-SHA256 request signing. See [HMAC](#hmac-request-signing).   |

Every resource method accepts an optional trailing **`RequestCallOptions`** — see [Per-call overrides](#per-call-overrides).

---

## Complete API reference

### `client.health`

| Method         | Returns              | HTTP                                                                   |
| -------------- | -------------------- | ---------------------------------------------------------------------- |
| `check(opts?)` | `{ status: string }` | `GET /healthz` — **no auth**; use for probes and synthetic monitoring. |

### `client.telemetry`

| Method                     | Returns                | HTTP                                          |
| -------------------------- | ---------------------- | --------------------------------------------- |
| `sendBatch(events, opts?)` | `{ accepted: number }` | `POST /v1/telemetry/batch` — **202 Accepted** |

> Validates the batch is non-empty before dialling the network. Server may cap batch size; typical limits are 500 events / 1 MiB body.

### `client.agents`

| Method                   | Returns         | HTTP                     |
| ------------------------ | --------------- | ------------------------ |
| `list(limit?, opts?)`    | `AgentRecord[]` | `GET /agents?limit=`     |
| `register(input, opts?)` | `AgentRecord`   | `POST /agents` — **201** |

### `client.kill`

| Method                         | Returns                   | HTTP                                                                 |
| ------------------------------ | ------------------------- | -------------------------------------------------------------------- |
| `latest(externalRef, opts?)`   | `KillEventRecord \| null` | `GET /agents/:externalRef/kill/latest` — **`null`** on **404**       |
| `record(input, opts?)`         | `KillEventRecord`         | `POST /kill` — **201** (auto `Idempotency-Key` from `correlationId`) |
| `evaluate(externalRef, opts?)` | `Record<string, unknown>` | `POST /kill/evaluate/:externalRef` — shape depends on kill-core      |

### Legacy flat methods (stable, `@deprecated` in JSDoc)

`KillSwitchClient` is an alias of `AgentKillSwitch`. The flat methods (`healthz`, `sendTelemetryBatch`, `registerAgent`, `listAgents`, `getLastKill`, `recordKill`, `evaluateKill`) delegate to the nested resources — prefer the nested API in new code.

---

## Advanced topics

### Idempotency

For any non-GET call that your runtime might retry — including outside this SDK — set an **`Idempotency-Key`** and your server can collapse repeats into a single logical operation.

```typescript
// Auto-derived from correlationId
await ks.kill.record({
  agentExternalRef: "agent-1",
  reason: "r",
  correlationId: "incident-42",
});
// → sends `Idempotency-Key: kill:agent-1:incident-42`

// Explicit override (per-call)
await ks.telemetry.sendBatch(events, {
  idempotencyKey: `batch:${cronId}:${shard}`,
});

// Explicit override (per-input on kill.record)
await ks.kill.record({
  agentExternalRef: "agent-1",
  reason: "r",
  idempotencyKey: "my-deduplication-key",
});
```

> The per-call `idempotencyKey` always wins. Both routes set the standard **`Idempotency-Key`** header.

### Retries & backoff

| Property                  | Behaviour                                                         |
| ------------------------- | ----------------------------------------------------------------- |
| Retried statuses          | **408**, **429**, **500**, **502**, **503**, **504**              |
| Retried transport errors  | DNS, TCP reset, TLS, ECONNREFUSED, premature close                |
| Backoff schedule          | Exponential with jitter (0.85 – 1.15×), capped at 8 s per attempt |
| `Retry-After` (seconds)   | Honoured up to 60 s                                               |
| `Retry-After` (HTTP-date) | Parsed and honoured (capped at 60 s)                              |
| Disable retries           | `maxRetries: 0` at client level                                   |

### Cancellation & deadlines

Every resource method accepts `{ signal?, timeout? }`. The SDK composes your caller signal with its own per-request timeout via `AbortSignal.any` — **first to fire wins**.

```typescript
// Hard deadline (k8s liveness, request deadline)
await ks.kill.evaluate("a1", { signal: AbortSignal.timeout(2_000) });

// Per-call timeout override (less than client default)
await ks.kill.evaluate("a1", { timeout: 500 });

// Cooperative cancel from a shared AbortController
const ctrl = new AbortController();
process.on("SIGTERM", () => ctrl.abort());
await ks.telemetry.sendBatch(events, { signal: ctrl.signal });
```

Aborts surface as **`APIUserAbortError`**. Timeouts include the configured timeout in the error message.

### Lifecycle hooks

Hooks let you stitch in distributed tracing, metrics, audit, and request enrichment without forking the SDK. All hooks may be `async` and run in declaration order.

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("agent-killswitch-sdk");

const ks = new AgentKillSwitch({
  baseURL: "…",
  apiKey: "…",
  hooks: {
    onRequest: (ctx) => {
      const span = tracer.startSpan(`AKS ${ctx.method} ${ctx.path}`);
      span.setAttribute("aks.request_id", ctx.requestId);
      span.setAttribute("aks.attempt", ctx.attempt);
      (ctx as any).__span = span;
    },
    onResponse: (ctx) => {
      const span = (ctx as any).__span as ReturnType<typeof tracer.startSpan>;
      span.setAttribute("http.status_code", ctx.response.status);
      span.setAttribute("aks.duration_ms", ctx.durationMs);
      span.end();
    },
    onRetry: (ctx) => {
      metrics.increment("killswitch.retry", {
        path: ctx.path,
        cause: typeof ctx.cause === "number" ? String(ctx.cause) : "error",
      });
    },
  },
});
```

Hook contexts:

| Hook         | Adds                                                             |
| ------------ | ---------------------------------------------------------------- |
| `onRequest`  | `method`, `path`, `url`, `headers`, `attempt`, `requestId`       |
| `onResponse` | `onRequest` fields + `response` + `durationMs`                   |
| `onRetry`    | `onRequest` fields + `waitMs` + `cause` (HTTP status or `Error`) |

> [!TIP]
> Hooks **must not** mutate the request body — only headers. Throwing from a hook aborts the request with the thrown error.

### Pluggable logger

Drop in any logger that exposes `debug`/`info`/`warn`/`error`. The SDK emits structured retry and connection events; it never logs bodies or credentials.

```typescript
import pino from "pino";

const log = pino();

const ks = new AgentKillSwitch({
  baseURL: "…",
  apiKey: "…",
  logger: {
    debug: (m, meta) => log.debug(meta, m),
    info: (m, meta) => log.info(meta, m),
    warn: (m, meta) => log.warn(meta, m),
    error: (m, meta) => log.error(meta, m),
  },
});
```

### HMAC request signing

Matches `apps/kill-core`'s opt-in signing mode. When enabled, every request gets four headers:

```http
X-AKS-Key-Id:    <keyId>
X-AKS-Signed-At: <unix-seconds>
X-AKS-Nonce:     <random 16 bytes, hex>
X-AKS-Signature: v1=<base64url(HMAC-SHA256(secret, canonical))>
```

`canonical` is the newline-joined string `v1\n<METHOD>\n<PATH>\n<signed-at>\n<nonce>\n<sha256-hex(body)>`. The server reconstructs and compares in constant time.

```typescript
const ks = new AgentKillSwitch({
  baseURL: "…",
  apiKey: "…",
  signing: {
    keyId: process.env.AKS_SIGNING_KEY_ID!,
    secret: process.env.AKS_SIGNING_SECRET!,
  },
});
```

Uses **Web Crypto** (`globalThis.crypto.subtle`) — works on Node 20+, Workers, Deno, Bun, modern browsers; **no polyfills required**.

### OpenTelemetry

The SDK is intentionally observability-agnostic. Two patterns work out of the box:

```typescript
// 1) Inject trace context via defaultHeaders (constant per-process)
import { context, propagation } from "@opentelemetry/api";

const carrier: Record<string, string> = {};
propagation.inject(context.active(), carrier);

const ks = new AgentKillSwitch({
  baseURL: "…",
  apiKey: "…",
  defaultHeaders: carrier,
});

// 2) Or per-call (dynamic context)
await ks.kill.record(input, { headers: extractCurrentTraceHeaders() });

// 3) Or wrap fetch with @opentelemetry/instrumentation-undici
import { fetch as otelFetch } from "./my-otel-fetch";
const ks2 = new AgentKillSwitch({
  baseURL: "…",
  apiKey: "…",
  fetch: otelFetch,
});
```

### Custom `fetch` (proxies, mTLS, edge)

```typescript
import { Agent, fetch as undiciFetch } from "undici";

const dispatcher = new Agent({
  connect: {
    ca: process.env.MTLS_CA,
    cert: process.env.MTLS_CERT,
    key: process.env.MTLS_KEY,
  },
});

const fetchImpl: typeof fetch = (input, init) =>
  undiciFetch(input as any, {
    ...(init as any),
    dispatcher,
  }) as unknown as Promise<Response>;

const ks = new AgentKillSwitch({ baseURL: "…", apiKey: "…", fetch: fetchImpl });
```

### Per-call overrides

```typescript
await ks.kill.record(input, {
  signal: AbortSignal.timeout(3_000),
  timeout: 3_000,
  headers: {
    "X-Tenant": "tenant-42",
    traceparent: "00-…-…-01",
  },
  idempotencyKey: "my-workflow-step-3",
  requestId: "req-correlated-with-upstream",
});
```

> Per-call headers cannot override built-in headers (`Authorization`, `X-Api-Key`, `Content-Type`, `User-Agent`, `Idempotency-Key`, `X-Request-Id`, `X-AKS-*`). Use the dedicated options instead.

---

## Runtime compatibility

| Runtime                          | Status | Notes                                                                           |
| -------------------------------- | ------ | ------------------------------------------------------------------------------- |
| **Node.js ≥ 20.10**              | ✅     | Uses native `fetch`, `AbortSignal.timeout`, `AbortSignal.any`, `crypto.subtle`. |
| **Node.js 18.x**                 | ❌     | Missing stable `AbortSignal.any`. Not supported.                                |
| **Cloudflare Workers**           | ✅     | Pass `fetch: globalThis.fetch`; outbound HTTPS must be allowed.                 |
| **Deno ≥ 1.45**                  | ✅     | Use `npm:@agent-killswitch/sdk-node` or via import map.                         |
| **Bun ≥ 1.1**                    | ✅     | Native fetch + AbortSignal + crypto.subtle are sufficient.                      |
| **AWS Lambda (Node 20 runtime)** | ✅     | Compose client-side `timeout` with Lambda's remaining time.                     |
| **Vercel Edge / Netlify Edge**   | ✅     | Web Crypto + fetch are available.                                               |
| **Browsers**                     | ⚠      | Functional but **never** put server API keys in the browser — use a BFF.        |

---

## Security model

| Control                        | Behaviour                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **TLS default**                | `baseURL` must be **`https:`** unless **`dangerouslyAllowInsecureHttp: true`** (trusted local dev only).                                        |
| **No credentials in URL**      | `https://user:pass@host` is **rejected** — use **`apiKey`** / **`bearerToken`**.                                                                |
| **No query/fragment on base**  | Stops accidental secret leakage via logs, proxies, or referrers.                                                                                |
| **Header hygiene**             | `defaultHeaders` and per-call `headers` cannot contain **CR / LF / NUL**; reasonable length caps apply.                                         |
| **Credential hygiene**         | `apiKey` / `bearerToken` cannot contain CR / LF / NUL.                                                                                          |
| **Path hardening**             | Request paths must start with **`/`**, cannot contain **`..`** or **`://`**.                                                                    |
| **Redaction**                  | API error messages and transport diagnostics pass **`redactSensitiveStrings`** (Bearer, Basic, `sk_*` / `ks_*`-style tokens, JWT-shaped blobs). |
| **Built-in header protection** | Per-call headers cannot override `Authorization`, `X-Api-Key`, `Idempotency-Key`, `X-Request-Id`, `User-Agent`, `Content-Type`, `X-AKS-*`.      |
| **Optional HMAC signing**      | Web Crypto HMAC-SHA256 over canonical request string. Server-side constant-time comparison expected.                                            |
| **Construction-time checks**   | `timeout` / `maxRetries` validated up front so bad config fails loudly at boot, not on first 3 AM page.                                         |

---

## Real-world recipes

### Express middleware — pre-action kill check

```typescript
import express from "express";
import AgentKillSwitch from "@agent-killswitch/sdk-node";

const app = express();
const ks = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!,
  apiKey: process.env.KILLSWITCH_API_KEY,
});

app.use("/agent/:id/tools/*", async (req, res, next) => {
  try {
    const latest = await ks.kill.latest(req.params.id, { timeout: 2_000 });
    if (latest && (latest.action === "kill" || latest.action === "pause")) {
      return res.status(423).json({
        error: "agent_locked",
        reason: latest.reason,
        decidedAt: latest.decidedAt,
      });
    }
    next();
  } catch {
    if (process.env.FAIL_CLOSED === "1")
      return res.status(503).json({ error: "killswitch_unreachable" });
    next();
  }
});
```

### AWS Lambda — short-deadline batch ingest

```typescript
import type { Handler } from "aws-lambda";
import AgentKillSwitch from "@agent-killswitch/sdk-node";

const ks = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!,
  apiKey: process.env.KILLSWITCH_API_KEY,
  maxRetries: 1,
});

export const handler: Handler = async (event, ctx) => {
  const deadlineMs = Math.max(500, ctx.getRemainingTimeInMillis() - 200);
  const result = await ks.telemetry.sendBatch(event.events ?? [], {
    timeout: deadlineMs,
  });
  return { statusCode: 202, body: JSON.stringify(result) };
};
```

### Cloudflare Worker — register + heartbeat on cron

```typescript
import AgentKillSwitch from "@agent-killswitch/sdk-node";

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const ks = new AgentKillSwitch({
      baseURL: env.KILLSWITCH_API_URL,
      apiKey: env.KILLSWITCH_API_KEY,
      fetch: globalThis.fetch,
    });
    await ks.telemetry.sendBatch([
      {
        type: "heartbeat",
        agentId: "edge-worker-1",
        emittedAt: new Date().toISOString(),
      },
    ]);
  },
};
```

### Next.js App Router route handler

```typescript
// app/api/agents/[id]/route.ts
import AgentKillSwitch from "@agent-killswitch/sdk-node";

const ks = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!,
  apiKey: process.env.KILLSWITCH_API_KEY,
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const latest = await ks.kill.latest(params.id);
  return Response.json({ killed: !!latest, kill: latest });
}
```

### NestJS provider

```typescript
import { Module, Injectable } from "@nestjs/common";
import AgentKillSwitch, {
  createKillSwitchClient,
} from "@agent-killswitch/sdk-node";

@Injectable()
export class KillSwitchService {
  readonly client: AgentKillSwitch;
  constructor() {
    this.client = createKillSwitchClient({
      baseURL: process.env.KILLSWITCH_API_URL!,
      apiKey: process.env.KILLSWITCH_API_KEY,
    });
  }
}

@Module({ providers: [KillSwitchService], exports: [KillSwitchService] })
export class KillSwitchModule {}
```

### Recording a kill with idempotency + full audit context

```typescript
await ks.kill.record(
  {
    agentExternalRef: "support-bot-1",
    reason: "tool_misuse_threshold_exceeded",
    action: "kill",
    correlationId: "incident_2026_05_14_001",
    metadata: {
      detectorVersion: "2026.05.0",
      score: 0.94,
      operator: "oncall@example.com",
    },
  },
  {
    headers: { "X-Tenant": "tenant-42" },
  },
);
```

### Policy probe — "would this be killed right now?"

```typescript
const decision = await ks.kill.evaluate("support-bot-1");
if (decision.action === "kill") {
  console.error("Pre-flight check failed:", decision.reason);
}
```

---

## Error reference

### HTTP error classes (thrown from resource methods)

| Class                   | Typical status | Operational notes                                                                     |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `AuthenticationError`   | 401            | Invalid or missing credentials — fix config before retry storm.                       |
| `PermissionDeniedError` | 403            | Valid identity but insufficient scope — policy / RBAC issue.                          |
| `NotFoundError`         | 404            | Resource missing — **not** used for `kill.latest` "no rows"; that returns **`null`**. |
| `BadRequestError`       | 400, 422       | Schema / validation — inspect **`message`** and **`details`**.                        |
| `RateLimitError`        | 429            | Exposes **`retryAfterMs`** when **`Retry-After`** is parseable.                       |
| `InternalServerError`   | ≥ 500          | Transient — SDK may retry according to **`maxRetries`**.                              |
| `KillSwitchApiError`    | other          | Generic non-success; always carries **`status`**, **`code`**, **`message`**.          |

### Transport & control flow

| Class                | When                                                           |
| -------------------- | -------------------------------------------------------------- |
| `APIConnectionError` | DNS, TLS, reset, or other failures **before** a response body. |
| `APIUserAbortError`  | **`AbortSignal`** abort or client timeout branch.              |
| `KillSwitchError`    | Local misuse (e.g. missing **`baseURL`**, invalid `timeout`).  |

### Error-handling template

```typescript
import {
  AuthenticationError,
  RateLimitError,
  APIConnectionError,
  APIUserAbortError,
  KillSwitchApiError,
} from "@agent-killswitch/sdk-node";

try {
  await ks.telemetry.sendBatch(events);
} catch (err) {
  if (err instanceof AuthenticationError) {
    metrics.increment("killswitch.auth_failure");
    await rotateCredentials();
  } else if (err instanceof RateLimitError) {
    metrics.histogram("killswitch.retry_after_ms", err.retryAfterMs ?? 0);
    await sleep(err.retryAfterMs ?? 5_000);
  } else if (err instanceof APIConnectionError) {
    log.warn({ err }, "killswitch unreachable; circuit will trip");
  } else if (err instanceof APIUserAbortError) {
    // Deadline/timeout/cancel — usually re-raise for outer cancel propagation.
    throw err;
  } else if (err instanceof KillSwitchApiError) {
    log.error({ status: err.status, code: err.code }, "killswitch api error");
    throw err;
  } else {
    throw err;
  }
}
```

---

## Package shape

- **Module system:** ESM only (`"type": "module"`).
- **Tree-shake:** `"sideEffects": false`.
- **Types:** ships `.d.ts` next to `.js`.
- **Runtime dependencies:** **only** `@agent-killswitch/shared-types`.
- **Bundle:** `dist/` is the published artifact; `src/` only ships in the public source mirror.
- **Files:** `dist/`, `README.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE`.

```text
@agent-killswitch/sdk-node
├── dist/
│   ├── index.js          # entry
│   ├── index.d.ts
│   ├── client.js
│   ├── errors.js
│   ├── hooks.js
│   ├── logger.js
│   ├── version.js
│   ├── resources/{agents,telemetry,kill,health,types}.js
│   ├── core/runner.js    # retries, backoff, hooks, signing
│   └── security/{transport,signing}.js
└── package.json
```

---

## Development & testing

```bash
pnpm install
pnpm --filter @agent-killswitch/shared-types build
pnpm --filter @agent-killswitch/sdk-node build
pnpm --filter @agent-killswitch/sdk-node typecheck
pnpm --filter @agent-killswitch/sdk-node test
```

Inject **`fetch`** in tests to assert URLs, headers, and retry behaviour without hitting the network:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import AgentKillSwitch from "@agent-killswitch/sdk-node";

test("attaches X-Api-Key on every request", async () => {
  const calls: Request[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push(new Request(input, init));
    return new Response('{"status":"ok"}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const ks = new AgentKillSwitch({
    baseURL: "https://api.example.com",
    apiKey: "ks_live_test",
    fetch: fakeFetch,
  });
  await ks.health.check();
  assert.equal(calls[0].headers.get("x-api-key"), "ks_live_test");
});
```

The repository ships **22 unit tests** covering retries, idempotency, signing, hooks, logger, timeouts, error mapping, redaction, and transport hardening.

---

## Versioning & releases

- **Semver** — breaking HTTP contract or TypeScript breaking changes → **major**; additive features → **minor**; fixes → **patch**.
- **`src/version.ts`** is kept in lockstep with **`package.json`** on every publish (release automation recommended).
- Releases on the public mirror are **Sigstore-signed** when available.
- See **[CHANGELOG.md](./CHANGELOG.md)** for the full history.

---

## Migration guide

### 0.3.x → 0.4.0

Breaking? **No** — 0.4.0 is fully backwards-compatible with 0.3.2. New surfaces are additive.

Recommended migrations:

```diff
- // 0.3.x: hand-built per-call options
- await ks.kill.record(input, { signal: AbortSignal.timeout(2000) });
+ // 0.4.0: timeout, headers, idempotencyKey, requestId all available
+ await ks.kill.record(input, {
+   timeout: 2_000,
+   idempotencyKey: 'workflow-step-3',
+   headers: { 'X-Tenant': 'tenant-42' },
+ });
```

```diff
- // 0.3.x: legacy flat client
- import { KillSwitchClient } from '@agent-killswitch/sdk-node';
- const c = new KillSwitchClient({ baseUrl: '…', fetchImpl });
+ // 0.4.0: nested resources
+ import AgentKillSwitch, { createKillSwitchClient } from '@agent-killswitch/sdk-node';
+ const c = createKillSwitchClient({ baseURL: '…', fetch });
```

The legacy `KillSwitchClient`, `baseUrl`, and `fetchImpl` continue to work.

---

## FAQ

**Does the SDK embed the policy engine or ML models?**
No. It calls your deployed HTTP APIs only.

**Can I use it from Edge / Cloudflare Workers / Deno / Bun?**
Yes — on any runtime with global `fetch`, `AbortSignal.timeout`, `AbortSignal.any`, and `crypto.subtle`. Pass `fetch: globalThis.fetch`.

**Does `kill.latest` throw on 404?**
No — it returns **`null`** so "no kill yet" stays a clean control-flow path.

**How do I disable retries?**
Set **`maxRetries: 0`** at client construction.

**How do I get a single source of truth for types?**
DTOs are re-exported from `@agent-killswitch/shared-types`. Import directly from the SDK to avoid version drift.

**Can the SDK refresh tokens automatically?**
No — it carries credentials, it doesn't manage them. Build a small credentials provider and recreate the client when secrets rotate.

**Why ESM-only?**
The control-plane stack and SDK target Node 20+, which is fully native ESM. CommonJS interop would add release surface and bug risk without commensurate benefit.

**How is the SDK secured at the supply-chain level?**
The public mirror runs **CodeQL**, **Semgrep**, **gitleaks**, **pnpm audit**, and produces **SBOMs** on every release. GitHub releases are signed.

**What's the difference between `correlationId` and `requestId`?**
`requestId` is per HTTP call (UUID), surfaced as `X-Request-Id`. `correlationId` is your _business_ identifier — typically an incident or trace ID — that you pass into `kill.record` to stitch the audit story.

**Is there an OpenAPI spec?**
The control plane publishes an OpenAPI document; consult your deployment's `/openapi.json`. The SDK is hand-tuned for ergonomics, not generated.

---

## Support

- **Issues & feature requests:** open a GitHub issue in the public mirror.
- **Security:** see [`SECURITY.md`](./SECURITY.md) for disclosure.
- **Enterprise support:** contact your account team for SLAs, custom builds, and assurance artefacts.

---

## License

MIT — see [LICENSE](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/blob/main/LICENSE) in the public repository.

---

<div align="center"><sub>Built with TypeScript, modern Node.js <code>fetch</code>, and <code>@agent-killswitch/shared-types</code>. <br/>Thanks to teams investing in governed autonomy — safer agents benefit everyone.</sub></div>
