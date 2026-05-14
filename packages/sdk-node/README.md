# @agent-killswitch/sdk-node

Production **Node.js / TypeScript** SDK for the **Agent Kill Switch** control plane. It mirrors the ergonomics of first-party cloud SDKs: a single entry client, **namespaced resources**, **timeouts**, **automatic retries** on transient failures, a **`User-Agent`** with package version, optional **`AbortSignal`** per call, and a **typed error hierarchy** for predictable error handling.

---

## Requirements

- **Node.js** `>= 20.10.0` (uses global `fetch`, `AbortSignal.timeout`, and `AbortSignal.any`).
- **ES modules** (`"type": "module"`, or import from an `.mjs` bundle).
- A reachable **Agent Kill Switch API** base URL.

---

## Installation

```bash
npm install @agent-killswitch/sdk-node
```

Runtime dependency **`@agent-killswitch/shared-types`** is pulled in automatically for shared DTOs.

---

## Quick start (recommended API)

```typescript
import AgentKillSwitch, {
  AuthenticationError,
  RateLimitError,
  KillSwitchApiError,
} from '@agent-killswitch/sdk-node';

const client = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!,
  apiKey: process.env.KILLSWITCH_API_KEY,
});

const { accepted } = await client.telemetry.sendBatch([
  { type: 'tool_call', agentId: 'my-agent-1', payload: { tool: 'search' } },
]);

const latestKill = await client.kill.latest('my-agent-1'); // null if none

await client.agents.register({ externalRef: 'my-agent-1', name: 'Research bot' });
```

**Default export** is the same as `AgentKillSwitch`:

```typescript
import Client from '@agent-killswitch/sdk-node';
const client = new Client({ baseURL: 'https://api.example.com', apiKey: '…' });
```

---

## Client options

| Option | Type | Description |
|--------|------|-------------|
| `baseURL` | `string` | API origin (no trailing slash required). |
| `baseUrl` | `string` | Deprecated alias of `baseURL`. |
| `apiKey` | `string` | Sent as `X-Api-Key` (checked before bearer on the server). |
| `bearerToken` | `string` | Sent as `Authorization: Bearer …`. |
| `fetch` | `typeof fetch` | Custom fetch (tests, proxies, non-standard runtimes). |
| `fetchImpl` | `typeof fetch` | Deprecated alias of `fetch`. |
| `defaultHeaders` | `Record<string,string>` | Merged into every request after built-in headers. |
| `timeout` | `number` | Per-request timeout in **ms** (default `60000`). Use `0` to disable the client-side timeout (still honors per-call `signal`). |
| `maxRetries` | `number` | Extra attempts after the first for **retriable** HTTP status (`408`, `429`, `500`–`504`) and connection errors (default `2`). |

Every resource method accepts an optional trailing **`RequestCallOptions`** argument: `{ signal?: AbortSignal }`, merged with the client timeout.

---

## Resources (nested API)

| Namespace | Methods | HTTP |
|-----------|---------|------|
| **`client.health`** | `check(signal?)` | `GET /healthz` (no auth) |
| **`client.telemetry`** | `sendBatch(events, signal?)` | `POST /v1/telemetry/batch` → **202** |
| **`client.agents`** | `list(limit?, signal?)` | `GET /agents` |
| | `register({ externalRef, name? }, signal?)` | `POST /agents` → **201** |
| **`client.kill`** | `latest(externalRef, signal?)` | `GET /agents/:externalRef/kill/latest` → **`null`** on **404** |
| | `record(input, signal?)` | `POST /kill` → **201** |
| | `evaluate(externalRef, signal?)` | `POST /kill/evaluate/:externalRef` → **200** |

Telemetry events are `Record<string, unknown>[]` so payloads stay aligned with your server’s ingestion contract.

---

## Legacy flat methods

`KillSwitchClient` is exported as an **alias** of `AgentKillSwitch`. The following flat methods remain and delegate to the nested API (marked `@deprecated` in types for IDE hints):

`healthz`, `sendTelemetryBatch`, `registerAgent`, `listAgents`, `getLastKill`, `recordKill`, `evaluateKill`.

---

## Errors

All API failures that return a response body are surfaced as **`KillSwitchApiError`** or a subclass:

| Class | Typical status |
|-------|----------------|
| `AuthenticationError` | 401 |
| `PermissionDeniedError` | 403 |
| `NotFoundError` | 404 |
| `BadRequestError` | 400, 422 |
| `RateLimitError` | 429 (reads `Retry-After` when present → `retryAfterMs`) |
| `InternalServerError` | ≥ 500 |
| `KillSwitchApiError` | other non-success |

Infrastructure failures before a parseable HTTP response use **`APIConnectionError`**. User or timeout aborts use **`APIUserAbortError`**. Configuration issues use **`KillSwitchError`**.

```typescript
try {
  await client.telemetry.sendBatch([]);
} catch (e) {
  if (e instanceof RateLimitError) {
    console.warn('Backoff (ms):', e.retryAfterMs);
  } else if (e instanceof KillSwitchApiError) {
    console.error(e.status, e.code, e.message);
  } else {
    throw e;
  }
}
```

---

## Version identifier

`VERSION` is exported from the package for support bundles and logging. The same value is sent in **`User-Agent`**: `AgentKillSwitch-JS/<VERSION>`.

---

## Exported types

From **`@agent-killswitch/shared-types`** (re-exported): `AgentRecord`, `KillEventRecord`, `TelemetryBatchAccepted`.

From this package: `AgentKillSwitchOptions`, `RegisterAgentInput`, `RecordKillInput`, `RequestCallOptions`, `ParsedApiError`.

---

## Development

```bash
pnpm install
pnpm run build
pnpm run typecheck
pnpm test
```

---

## Security

Never commit secrets. Use environment variables or a managed secret store. Rotate API keys on compromise.

---

## License

MIT.
