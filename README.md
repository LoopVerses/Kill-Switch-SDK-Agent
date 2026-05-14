<div align="center">

# Kill Switch SDK Agent

[![npm](https://img.shields.io/badge/npm-%40agent--killswitch%2Fsdk--node-0.3.2-CB3837?logo=npm)](https://www.npmjs.com/package/@agent-killswitch/sdk-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/LoopVerses/Kill-Switch-SDK-Agent/ci.yml?branch=main&label=CI)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/actions)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.10-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

### Enterprise-grade public SDK for governed AI agent operations

Official **Node.js / TypeScript** client for the **Agent Kill Switch** control plane — **resource-oriented API**, **timeouts & automatic retries**, **typed error hierarchy**, **transport hardening** (HTTPS-by-default, header injection guards, secret redaction in errors), plus shared **DTOs** for type-safe integrations.

[**Complete SDK reference →**](./packages/sdk-node/README.md)

[Why this repo](#why-this-repository) · [Packages](#packages) · [Install](#install) · [Quick start](#quick-start) · [Security](#security-posture) · [Local development](#local-development) · [CI](#continuous-integration) · [License](#license)

</div>

---

## Why this repository

**Kill Switch SDK Agent** is the **public, npm-publishable** surface for integrating customer runtimes with the Agent Kill Switch platform. It is intentionally **small and auditable**: two workspace packages, strict TypeScript, automated CI on every push, and documentation written for **platform engineers** and **application owners** — not toy demos.

If you operate agents in production and need **telemetry ingestion**, **agent registry**, **kill recording**, and **policy evaluation hooks** over HTTPS with first-party SDK ergonomics, this is the supported path.

---

## Packages

| Package | Version | Role |
|---------|---------|------|
| [**`@agent-killswitch/sdk-node`**](./packages/sdk-node/) | **0.3.2** | Production HTTP client: `AgentKillSwitch` with `health`, `telemetry`, `agents`, `kill` namespaces; resilient transport; optional dev-only `http` via explicit flag. |
| [**`@agent-killswitch/shared-types`**](./packages/shared-types/) | **0.3.0** | Shared contracts (`KillEventRecord`, `AgentRecord`, …) consumed by the SDK and portable to your apps. |

Install the SDK from npm; `shared-types` is pulled in as a **runtime dependency** of the client.

---

## Install

```bash
npm install @agent-killswitch/sdk-node
```

```bash
pnpm add @agent-killswitch/sdk-node
```

```bash
yarn add @agent-killswitch/sdk-node
```

**Requirements:** Node **≥ 20.10**, **ESM**. See [`packages/sdk-node/README.md`](./packages/sdk-node/README.md) for full detail.

---

## Quick start

```typescript
import AgentKillSwitch from '@agent-killswitch/sdk-node';

const client = new AgentKillSwitch({
  baseURL: process.env.KILLSWITCH_API_URL!, // must be https:// in production
  apiKey: process.env.KILLSWITCH_API_KEY!,
});

const { accepted } = await client.telemetry.sendBatch([
  { type: 'heartbeat', agentId: 'my-agent', emittedAt: new Date().toISOString() },
]);

const kill = await client.kill.latest('my-agent'); // null if none
console.log({ accepted, kill });
```

For **local `http://`** only, set **`dangerouslyAllowInsecureHttp: true`** — never in production. Full tables, error classes, and architecture notes are in the [package README](./packages/sdk-node/README.md).

---

## Security posture

The SDK enforces **defense-in-depth at the HTTP boundary**: TLS by default, rejection of credentials embedded in URLs, CRLF-safe headers, safe request paths, and **redaction** of common secret patterns in error text. This **complements** — not replaces — your **API gateway**, **WAF**, **mTLS**, **short-lived tokens**, and **org-scoped keys** on the server.

Read the dedicated section: [**Transport & supply-chain security**](./packages/sdk-node/README.md#transport--supply-chain-security-sdk-enforced).

---

## Local development

From the repository root:

```bash
corepack enable
pnpm install
pnpm run typecheck
pnpm run build
pnpm run test
```

Or use **pnpm 9.15+** globally; the root `package.json` declares `"packageManager": "pnpm@9.15.0"`.

---

## Continuous integration

Every push and pull request to **`main`** runs **install → typecheck → build → test** on **Ubuntu** with **pnpm 9.15.0** and **Node 20 LTS**. You can also trigger a run manually via **Actions → CI → Run workflow**.

---

## License

[MIT](./LICENSE)

---

## Links

- **Repository:** https://github.com/LoopVerses/Kill-Switch-SDK-Agent  
- **npm (when published):** https://www.npmjs.com/package/@agent-killswitch/sdk-node  
- **Deep documentation:** [`packages/sdk-node/README.md`](./packages/sdk-node/README.md)
