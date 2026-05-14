<div align="center">

# Kill Switch SDK Agent

[![npm package](https://img.shields.io/badge/npm-%40agent--killswitch%2Fsdk--node-0.3.0-CB3837?logo=npm)](https://www.npmjs.com/package/@agent-killswitch/sdk-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Public **Node.js / TypeScript** SDK for the [**Agent Kill Switch**](https://github.com/LoopVerses/Kill-Switch-SDK-Agent) control plane — telemetry, agents, kill events, and evaluation APIs.

[**Package README**](./packages/sdk-node/README.md) · [**Install**](#quick-install) · [**Build**](#monorepo)

</div>

---

## Packages

| Package | npm | Description |
|---------|-----|--------------|
| [`@agent-killswitch/sdk-node`](./packages/sdk-node/) | `@agent-killswitch/sdk-node` | Production HTTP client: resources, retries, typed errors. **v0.3.0** |
| [`@agent-killswitch/shared-types`](./packages/shared-types/) | `@agent-killswitch/shared-types` | Shared TypeScript DTOs for the SDK. |

---

## Quick install

```bash
npm install @agent-killswitch/sdk-node
```

Full documentation: [`packages/sdk-node/README.md`](./packages/sdk-node/README.md).

---

## Monorepo

```bash
pnpm install
pnpm run build
pnpm run test
```

---

## License

[MIT](./LICENSE)
