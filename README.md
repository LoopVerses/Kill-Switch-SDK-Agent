<div align="center">

# Kill Switch SDK Agent

[![npm](https://img.shields.io/badge/npm-%40agent--killswitch%2Fsdk--node-0.3.0-CB3837?logo=npm)](https://www.npmjs.com/package/@agent-killswitch/sdk-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/LoopVerses/Kill-Switch-SDK-Agent/ci.yml?branch=main&label=CI)](https://github.com/LoopVerses/Kill-Switch-SDK-Agent/actions)

### Official public SDK for the Agent Kill Switch control plane

**Enterprise-oriented Node.js / TypeScript** client: resource-style API, **timeouts & retries**, **typed errors**, **telemetry**, **agents**, **kill** APIs — documented for production operators and application engineers.

[**Full SDK documentation →**](./packages/sdk-node/README.md)

</div>

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@agent-killswitch/sdk-node`](./packages/sdk-node/) | **0.3.0** | HTTP client for the control plane. |
| [`@agent-killswitch/shared-types`](./packages/shared-types/) | **0.3.0** | Shared TypeScript DTOs. |

---

## Install

```bash
npm install @agent-killswitch/sdk-node
```

---

## Monorepo

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run test
```

---

## License

[MIT](./LICENSE)
