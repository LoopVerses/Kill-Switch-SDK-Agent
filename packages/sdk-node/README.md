<div align="center">

# Agent Kill Switch — Node.js SDK

[![npm](https://img.shields.io/badge/npm-%40agent--killswitch%2Fsdk--node-0.3.2-CB3837?logo=npm)](https://www.npmjs.com/package/@agent-killswitch/sdk-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/@agent-killswitch/sdk-node?color=339933&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/LoopVerses/Kill-Switch-SDK-Agent/ci.yml?branch=main&label=CI)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/actions)

### Enterprise-grade TypeScript client for governed AI agent operations

**Telemetry · agent registry · kill decisions · policy evaluation** — all over HTTPS with **resource-oriented APIs**, **automatic resilience** (timeouts, retries, backoff), a **typed error surface** suitable for SRE playbooks, and **first-class cancellation** via `AbortSignal`. Built for teams that treat autonomous agents as **production systems**, not demos.

[Installation](#installation) · [Quick start](#quick-start) · [Architecture](#how-it-fits-your-stack) · [API reference](#complete-api-reference) · [Errors & reliability](#errors--reliability) · [Security](#security--compliance-minded-usage) · [FAQ](#faq)

</div>

---

> **Platform vs SDK** — This package is the **official Node.js / TypeScript HTTP client** for the Agent Kill Switch **control plane APIs**. The broader platform (FastAPI services, Go executors, policy engines, operator dashboards) ships separately. The public source mirror lives at [**LoopVerses/Kill-Switch-SDK-Agent**](https://github.com/LoopVerses/Kill-Switch-SDK-Agent).

---

## Table of contents

1. [Why teams choose this SDK](#why-teams-choose-this-sdk)
2. [Transport & supply-chain security](#transport--supply-chain-security-sdk-enforced)
3. [What you can build](#what-you-can-build)
4. [How it fits your stack](#how-it-fits-your-stack)
5. [Requirements](#requirements)
6. [Installation](#installation)
7. [Quick start](#quick-start)
8. [Authentication](#authentication)
9. [Client configuration](#client-configuration)
10. [Complete API reference](#complete-api-reference)
11. [Telemetry payloads](#telemetry-payloads)
12. [Errors & reliability](#errors--reliability)
13. [Observability](#observability)
14. [Security & compliance-minded usage](#security--compliance-minded-usage)
15. [Development & testing](#development--testing)
16. [Versioning & releases](#versioning--releases)
17. [FAQ](#faq)
18. [Acknowledgements](#acknowledgements)
19. [License](#license)

---

## Why teams choose this SDK

| Capability | Why it matters in production |
|------------|------------------------------|
| **Resource layout** | `client.telemetry`, `client.agents`, `client.kill`, `client.health` — predictable structure similar to hyperscaler SDKs; onboard new engineers faster. |
| **Deterministic errors** | Subclasses for **401 / 403 / 404 / 400 / 429 / 5xx** plus **connection** and **abort** types — your alert routing and retries stay explicit, not string-based. |
| **Resilient transport** | Timeouts, capped exponential backoff, optional **`Retry-After`** honouring on **429**, retries on **408** and **5xx** — fewer flaky deploys when the control plane is under load. |
| **Cancellation** | Every call accepts **`AbortSignal`** — propagate shutdown from Kubernetes, serverless deadlines, or user cancel. |
| **Minimal footprint** | No heavy runtime beyond **`fetch`** (Node 20+) and a small dependency on **`@agent-killswitch/shared-types`**. |
| **Enterprise ergonomics** | Versioned **`User-Agent`**, stable **`VERSION` export**, ESM-native, **strict TypeScript** friendly. |
| **Transport hardening** | **HTTPS-by-default**, explicit **`dangerouslyAllowInsecureHttp`** for dev-only `http:`, **header injection** guards (CR/LF/NUL), **no userinfo** in `baseURL`, **safe request paths**, **secret redaction** in errors. |

---

## Transport & supply-chain security (SDK-enforced)

These checks run **inside your process** before any request is sent. They **do not** replace server auth, WAF, rate limits, or mTLS — they stop whole classes of client misconfiguration and injection so a compromised string is less likely to become a successful exploit.

| Control | Behaviour |
|---------|-----------|
| **TLS default** | `baseURL` must be **`https:`** unless **`dangerouslyAllowInsecureHttp: true`** (trusted local dev only). |
| **No credentials in URL** | `https://user:pass@host` is **rejected** — use **`apiKey`** / **`bearerToken`**. |
| **No query/fragment on base** | Stops accidental secret leakage via logs, proxies, or referrers. |
| **Header hygiene** | `defaultHeaders` cannot contain **CR/LF/NUL**; reasonable length caps apply. |
| **Credential hygiene** | `apiKey` / `bearerToken` cannot contain CR/LF/NUL. |
| **Path hardening** | Request paths must start with **`/`**, cannot contain **`..`** or **`://`**. |
| **Redaction** | API error messages and transport diagnostics pass **`redactSensitiveStrings`** (Bearer, Basic, `sk_*` / `ks_*`-style tokens, JWT-shaped blobs). |

**`@agent-killswitch/agentwatch-node`** applies the same model to **`baseUrl`** (with **`dangerouslyAllowInsecureHttp`** for local `http://`), sanitizes merged headers, and redacts ingest failure text.

---

## What you can build

- **Always-on agent workers** that heartbeat and stream tool telemetry into the control plane for anomaly scoring.
- **Approval-gated runtimes** that query **`kill.latest`** before each high-risk tool invocation.
- **Orchestrators** that register agents dynamically and attach org-scoped API keys per tenant.
- **Incident automation** that records kills with rich **`metadata`** and correlates via **`correlationId`**.
- **Policy probes** that call **`kill.evaluate`** against kill-core without reimplementing HTTP and auth.

---

## How it fits your stack

```mermaid
flowchart LR
  subgraph Runtime["Your runtime"]
    A[Agents / workers / services]
  end
  subgraph SDK["@agent-killswitch/sdk-node"]
    C[AgentKillSwitch]
  end
  subgraph CP["Control plane HTTPS API"]
    API[Ingest · agents · kill · evaluate]
  end
  A --> C
  C -->|TLS + auth| API
```

The SDK is a **thin, opinionated HTTP layer**: it does not embed policy DSL, ML models, or dashboard UI — it connects your processes to the APIs that do.

---

## Requirements

| Requirement | Notes |
|-------------|--------|
| **Node.js** | `>= 20.10.0` (uses global `fetch`, `AbortSignal.timeout`, `AbortSignal.any`). |
| **Module system** | **ESM** — `"type": "module"` or equivalent bundler pipeline. |
| **Network** | Outbound HTTPS to your **`baseURL`**; proxy support via custom **`fetch`**. |

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

**Peer contract:** `@agent-killswitch/shared-types` is a **runtime dependency** of this package and is installed automatically — you import DTOs from the SDK’s re-exports or from `shared-types` directly if you prefer.

---

## Quick start

### 1. Configure secrets (environment)

Never commit API keys or JWTs. Example for shell-based dev:

```bash
export KILLSWITCH_API_URL="https://api.yourcompany.com"
export KILLSWITCH_API_KEY="ks_live_…"
```

### 2. Instantiate the client

```typescript
import AgentKillSwitch, {
  AuthenticationError,
  KillSwitchApiError,
  RateLimitError,
} from '@agent-killswitch/sdk-node';

const client = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!,
  apiKey: process.env.KILLSWITCH_API_KEY,
  timeout: 60_000,
  maxRetries: 2,
});
```

### 3. Ingest telemetry, read kill state, register agents

```typescript
const { accepted } = await client.telemetry.sendBatch([
  {
    type: 'tool_call',
    agentId: 'support-bot-1',
    emittedAt: new Date().toISOString(),
    payload: { tool: 'web_search', query_len: 42 },
  },
]);

const latestKill = await client.kill.latest('support-bot-1');
if (latestKill) {
  console.warn('Agent is in post-kill state', latestKill.reason, latestKill.decidedAt);
}

await client.agents.register({
  externalRef: 'support-bot-1',
  name: 'Tier-1 support bot',
});
```

### 4. Default export

`import Client from '@agent-killswitch/sdk-node'` is identical to **`AgentKillSwitch`**.

### 5. Cancellation & deadlines

```typescript
const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), 8_000);

try {
  await client.telemetry.sendBatch([{ type: 'ping' }], { signal: ctrl.signal });
} finally {
  clearTimeout(t);
}
```

---

## Authentication

Your control plane validates credentials server-side. This SDK supports the common patterns:

| Mechanism | SDK option | HTTP behaviour |
|-----------|------------|----------------|
| **API key** (DB-backed, opaque, or key JWT) | `apiKey: string` | Sets **`X-Api-Key`**. Typically evaluated **before** bearer tokens on the server. |
| **User or machine JWT** | `bearerToken: string` | Sets **`Authorization: Bearer …`**. |

**Guidance**

- Prefer **one** primary mechanism per integration to simplify auditing.
- For multi-tenant SaaS, issue **per-tenant keys** with the smallest scope your API supports.
- Rotate keys on compromise; use a secrets manager in production.

Optional **`defaultHeaders`** merge **after** built-in headers — useful for internal **request signing**, **WAF tokens**, or **trace propagation** (`traceparent`, etc.).

---

## Client configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseURL` | `string` | — | **Required.** Origin of the API, e.g. `https://api.example.com`. Trailing slash is stripped. |
| `baseUrl` | `string` | — | Deprecated alias of **`baseURL`**. |
| `apiKey` | `string` | — | API key credential. |
| `bearerToken` | `string` | — | Bearer JWT or compatible token. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch (tests, proxies, non-Node runtimes wrapped with `fetch` semantics). |
| `fetchImpl` | `typeof fetch` | — | Deprecated alias of **`fetch`**. |
| `defaultHeaders` | `Record<string, string>` | `{}` | Extra headers on **every** request. |
| `timeout` | `number` | `60000` | Client-side per-request timeout (**ms**). Use **`0`** to disable (still respects **`signal`**). |
| `maxRetries` | `number` | `2` | **Additional** attempts after the first for retriable HTTP statuses and connection errors. |
| `dangerouslyAllowInsecureHttp` | `boolean` | `false` | If **`true`**, allows **`http://`** `baseURL` (local dev only). **Never** enable in production. |

Every resource method accepts an optional trailing **`RequestCallOptions`**: `{ signal?: AbortSignal }`.

---

## Complete API reference

### `client.health`

| Method | Returns | HTTP |
|--------|---------|------|
| `check(opts?)` | `{ status: string }` | `GET /healthz` — **no auth**; use for probes and synthetic monitoring. |

### `client.telemetry`

| Method | Returns | HTTP |
|--------|---------|------|
| `sendBatch(events, opts?)` | `{ accepted: number }` | `POST /v1/telemetry/batch` — **202 Accepted** |

Server may cap batch size; consult your deployment’s limits.

### `client.agents`

| Method | Returns | HTTP |
|--------|---------|------|
| `list(limit?, opts?)` | `AgentRecord[]` | `GET /agents?limit=` |
| `register(input, opts?)` | `AgentRecord` | `POST /agents` — **201** |

### `client.kill`

| Method | Returns | HTTP |
|--------|---------|------|
| `latest(externalRef, opts?)` | `KillEventRecord \| null` | `GET /agents/:externalRef/kill/latest` — **`null`** on **404** |
| `record(input, opts?)` | `KillEventRecord` | `POST /kill` — **201** |
| `evaluate(externalRef, opts?)` | `Record<string, unknown>` | `POST /kill/evaluate/:externalRef` — shape depends on kill-core |

### Legacy flat methods (stable)

`KillSwitchClient` is an **alias** of **`AgentKillSwitch`**. These methods delegate to the nested API: `healthz`, `sendTelemetryBatch`, `registerAgent`, `listAgents`, `getLastKill`, `recordKill`, `evaluateKill` (marked `@deprecated` in JSDoc — prefer nested calls in new code).

---

## Telemetry payloads

Events are **`Record<string, unknown>[]`** so your platform can evolve fields without waiting for SDK releases. Recommended conventions (informational — align with your server contract):

| Field | Purpose |
|-------|---------|
| `type` | Event discriminator (`tool_call`, `heartbeat`, `model_output`, …). |
| `agentId` or `agentExternalRef` | Tie events to an agent identity your API understands. |
| `emittedAt` | ISO-8601 timestamp for ordering and latency analysis. |
| `payload` | Arbitrary structured detail for analytics and forensics. |

---

## Errors & reliability

### HTTP error classes

| Class | Typical status | Operational notes |
|-------|----------------|---------------------|
| `AuthenticationError` | 401 | Invalid or missing credentials — fix config before retry storm. |
| `PermissionDeniedError` | 403 | Valid identity but insufficient scope — policy / RBAC issue. |
| `NotFoundError` | 404 | Resource missing — **not** used for `kill.latest` “no rows”; that returns **`null`**. |
| `BadRequestError` | 400, 422 | Schema / validation — inspect **`message`** and **`details`**. |
| `RateLimitError` | 429 | Exposes **`retryAfterMs`** when **`Retry-After`** is parseable. |
| `InternalServerError` | ≥ 500 | Transient — SDK may retry according to **`maxRetries`**. |
| `KillSwitchApiError` | other | Generic non-success; always carries **`status`**, **`code`**, **`message`**. |

### Transport & control flow

| Class | When |
|-------|------|
| `APIConnectionError` | DNS, TLS, reset, or other failures **before** a response body. |
| `APIUserAbortError` | **`AbortSignal`** abort or client timeout branch. |
| `KillSwitchError` | Local misuse (e.g. missing **`baseURL`**). |

### Retry semantics (summary)

- Retries apply to **408**, **429**, **500**, **502**, **503**, **504**, and **connection errors**.
- Backoff is **exponential with jitter**, capped; **429** may respect **`Retry-After`** (seconds or HTTP-date).
- **Non-idempotent** writes (`record`, `sendBatch`) can be retried by the SDK when the failure was **before** your business logic committed — design server-side **idempotency keys** if duplicates are unacceptable.

---

## Observability

- **`VERSION`** export — pin in support bundles and structured logs.
- **`User-Agent: AgentKillSwitch-JS/<VERSION>`** — set on every request so your API gateway and logs can segment SDK traffic.
- Pair with your platform’s **`request_id` / `trace_id`** headers via **`defaultHeaders`**.

---

## Security & compliance-minded usage

- **Secrets:** Load from env, vault, or cloud secret manager — never log raw keys.
- **TLS:** Use HTTPS `baseURL` in production; terminate TLS at your edge as per org policy.
- **Least privilege:** Scope API keys to the minimum **org** and **capabilities** required.
- **Data minimization:** Send only telemetry fields your governance model allows.
- **Audit:** Correlate kills with **`correlationId`** and structured **`metadata`** for downstream audit stores.

---

## Development & testing

In this monorepo (or the [public mirror](https://github.com/LoopVerses/Kill-Switch-SDK-Agent)):

```bash
pnpm install
pnpm --filter @agent-killswitch/shared-types build
pnpm --filter @agent-killswitch/sdk-node build
pnpm --filter @agent-killswitch/sdk-node test
```

Inject **`fetch`** in tests to assert URLs, headers, and retry behaviour without hitting the network.

---

## Versioning & releases

- **Semver** — breaking HTTP contract or TypeScript breaking changes → **major**; additive features → **minor**; fixes → **patch**.
- Keep **`src/version.ts`** in lockstep with **`package.json` `"version"`** on every publish (release automation recommended).

---

## FAQ

**Does the SDK embed the policy engine or ML models?**  
No. It calls your deployed HTTP APIs only.

**Can I use it from Edge / Cloudflare Workers?**  
If your runtime provides **`fetch`** and modern **`AbortSignal`** APIs, pass it via the **`fetch`** option and validate timeout behaviour.

**Does `kill.latest` throw on 404?**  
No — it returns **`null`** so “no kill yet” stays a clean control-flow path.

**How do I disable retries?**  
Set **`maxRetries: 0`**.

---

## Acknowledgements

Built with **TypeScript**, modern **Node.js** **fetch**, and **`@agent-killswitch/shared-types`**. Thanks to teams investing in **governed autonomy** — safer agents benefit everyone.

---

## License

MIT — see [LICENSE](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/blob/main/LICENSE) in the public repository.
