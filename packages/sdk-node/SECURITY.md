# Security policy

## Supported versions

| Version | Supported           |
| ------- | ------------------- |
| 0.4.x   | ✅                  |
| 0.3.x   | ✅ (critical fixes) |
| < 0.3   | ❌                  |

## Reporting a vulnerability

**Please do not file public GitHub issues for security reports.**

- Open a **GitHub Security Advisory** in the public mirror: <https://github.com/LoopVerses/Kill-Switch-SDK-Agent/security/advisories/new>
- Or email the maintainers privately (see the `SECURITY.md` in the public mirror for the current contact).

We aim to acknowledge reports within **2 business days** and to issue fixes for critical vulnerabilities within **14 days** of triage, depending on complexity and disclosure coordination.

## Scope

The SDK's threat model covers:

| In scope                                                                      | Out of scope                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Header / URL / path injection via SDK options or per-call overrides.          | Bugs in your control-plane server, networking infrastructure, or auth provider. |
| Secret leakage in error messages or thrown stack traces.                      | Vulnerabilities in third-party `fetch` implementations you inject.              |
| Type-safety violations that expose unsafe coercions to caller code.           | Misuse of HTTP `http://` `baseURL` with `dangerouslyAllowInsecureHttp: true`.   |
| HMAC signing correctness against the documented canonical string format.      | Server-side validation of the signature (covered by the control plane).         |
| Retry/idempotency contracts that could cause unintended duplicate operations. | Network-level reordering between the SDK and the control plane.                 |
| Supply-chain integrity of the npm artefact and its declared dependencies.     | Dependencies of `@agent-killswitch/shared-types` (track upstream policy).       |

## Hardening defaults

The SDK applies several hardening defaults at construction and on every request:

- **HTTPS-only** `baseURL` (unless `dangerouslyAllowInsecureHttp: true` for trusted local dev).
- **No userinfo / query / fragment** on the base URL.
- **CR / LF / NUL** header injection guards on `defaultHeaders`, per-call `headers`, and credentials.
- **Path hardening:** request paths must start with `/`, must not contain `..` or `://`.
- **Built-in header protection:** per-call `headers` cannot override `Authorization`, `X-Api-Key`, `Content-Type`, `User-Agent`, `Idempotency-Key`, `X-Request-Id`, or `X-AKS-*`.
- **Secret redaction** in API error bodies and transport diagnostics — Bearer / Basic tokens, `sk_*` / `ks_*` keys, and JWT-shaped blobs are rewritten to `[REDACTED]`.
- **Construction-time validation** of `timeout` and `maxRetries` so misconfigurations fail loudly at boot.

## Supply chain

The public mirror runs the following on every commit and release:

- **CodeQL** (TypeScript, JavaScript)
- **Semgrep** (OWASP top ten + language packs)
- **gitleaks** (secret scanning)
- **pnpm audit** (production dependencies, `critical` level)
- **SBOM** + **Sigstore cosign** signatures on release artefacts when CI provisions them.

You can verify SDK release tarballs against the published Sigstore signatures (see [CHANGELOG.md](./CHANGELOG.md) for the matching commit SHAs).

## Cryptography

The SDK uses Web Crypto (`globalThis.crypto.subtle`) for HMAC request signing:

- **Algorithm:** HMAC-SHA256
- **Canonical string format:** `v1\n<METHOD>\n<PATH>\n<signed-at>\n<nonce>\n<sha256-hex(body)>`
- **Signature header:** `X-AKS-Signature: v1=<base64url(HMAC)>`
- **Nonce:** 16 random bytes (hex) via `crypto.getRandomValues`.
- **Timestamp:** `Math.floor(Date.now() / 1000)` — server expected to reject stale (> 5 min skew) timestamps.

The secret is held only in memory by the `RequestRunner` and never serialized into error messages or logs.
