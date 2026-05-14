# Changelog

All notable changes to **`@agent-killswitch/sdk-node`** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.4.0] — 2026-05-14

### Added

- **Idempotency keys** — `Kill.record` automatically derives an `Idempotency-Key` header from `correlationId` when one isn't explicitly provided; per-call and per-input overrides supported.
- **Per-call overrides** — `RequestCallOptions` now accepts `headers`, `timeout`, `idempotencyKey`, and `requestId` alongside `signal`. Built-in headers are protected from override.
- **Lifecycle hooks** — `Hooks.onRequest`, `Hooks.onResponse`, `Hooks.onRetry` (all `async`, ordered) for tracing, metrics, audit, and request enrichment.
- **Pluggable `Logger`** — `console`/`pino`/`winston`-compatible interface; the SDK emits retry and connection events without ever logging bodies or credentials. `NoopLogger` exported for tests.
- **HMAC request signing** — opt-in `signing: { keyId, secret }` configuration; HMAC-SHA256 over a canonical request string, headers `X-AKS-Key-Id`, `X-AKS-Signed-At`, `X-AKS-Nonce`, `X-AKS-Signature`. Uses Web Crypto; works on Node 20+, Workers, Deno, Bun.
- **`X-Request-Id`** header generated per call (or overridable via `RequestCallOptions.requestId`); surfaced in hook context for trace stitching.
- **`createKillSwitchClient(opts)` factory** — reads naturally in DI containers and functional code.

### Changed

- **`Retry-After` HTTP-date** parsing is now honoured by the retry scheduler (previously only `RateLimitError.retryAfterMs` parsed dates).
- **`AbortSignal.timeout`'s `TimeoutError`** is now classified correctly as `APIUserAbortError` (was leaking as a connection error in some Node versions).
- **`telemetry.sendBatch([])`** now throws `KillSwitchError` locally instead of dialling the network.
- **Construction-time validation** — invalid `timeout` or `maxRetries` throw `KillSwitchError` at the constructor instead of failing on the first call.
- **`User-Agent`** now includes the exported `VERSION` constant for stable gateway segmentation (`AgentKillSwitch-JS/0.4.0`).

### Security

- Built-in headers (`Authorization`, `X-Api-Key`, `Content-Type`, `User-Agent`, `Idempotency-Key`, `X-Request-Id`, `X-AKS-*`) cannot be overridden via per-call `headers` — prevents accidental credential downgrade.

### Documentation

- README rewritten to elite/enterprise standard — feature matrix, runtime-compatibility table, real-world recipes (Express, Lambda, Cloudflare Worker, Next.js, NestJS), error reference, migration guide, FAQ, support.
- `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` now ship in the package.

## [0.3.2] — 2026-05-13

### Added

- Resource-style nested API: `client.{health, telemetry, agents, kill}`.
- Typed error subclasses for 400/401/403/404/422/429/5xx + transport/abort.
- HTTPS-by-default + `dangerouslyAllowInsecureHttp` escape hatch.
- Header CR/LF/NUL injection guards; secret redaction in error surfaces.
- Custom `fetch` injection for proxies, mTLS, edge runtimes.

### Changed

- Renamed `baseUrl` → `baseURL` (legacy alias kept).
- Renamed `fetchImpl` → `fetch` (legacy alias kept).

### Deprecated

- `KillSwitchClient` (use `AgentKillSwitch`).
- Flat methods (`healthz`, `sendTelemetryBatch`, `registerAgent`, `listAgents`, `getLastKill`, `recordKill`, `evaluateKill`) — prefer nested API.

## [0.3.0] — Initial public release

- First public TypeScript SDK for the Agent Kill Switch control plane.

[0.4.0]: https://github.com/LoopVerses/Kill-Switch-SDK-Agent/releases/tag/v0.4.0
[0.3.2]: https://github.com/LoopVerses/Kill-Switch-SDK-Agent/releases/tag/v0.3.2
