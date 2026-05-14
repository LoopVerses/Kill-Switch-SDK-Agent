# Kill Switch SDK Agent

Public **Node.js / TypeScript** SDK for the **Agent Kill Switch** control plane: authentication, telemetry batches, agent registration, kill events, and kill evaluation over HTTPS.

This repository contains:

| Package | npm scope | Description |
|---------|-----------|-------------|
| [`@agent-killswitch/sdk-node`](./packages/sdk-node/) | `@agent-killswitch/sdk-node` | Production HTTP client (resources, retries, typed errors). |
| [`@agent-killswitch/shared-types`](./packages/shared-types/) | `@agent-killswitch/shared-types` | Shared TypeScript DTOs used by the SDK. |

## Quick install

```bash
npm install @agent-killswitch/sdk-node
```

Full API documentation lives in [`packages/sdk-node/README.md`](./packages/sdk-node/README.md).

## Monorepo scripts

```bash
pnpm install
pnpm run build
pnpm run test
```

## Repository

https://github.com/LoopVerses/Kill-Switch-SDK-Agent

## License

MIT — see [LICENSE](./LICENSE).
