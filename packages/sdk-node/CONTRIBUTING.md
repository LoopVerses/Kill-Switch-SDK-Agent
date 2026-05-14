# Contributing to `@agent-killswitch/sdk-node`

Thanks for your interest in improving the Node.js SDK for Agent Kill Switch.

## Where development happens

This package is developed inside the private monorepo and **mirrored** to the public repository [LoopVerses/Kill-Switch-SDK-Agent](https://github.com/LoopVerses/Kill-Switch-SDK-Agent) for releases and external contributions. Issues opened on the public mirror are triaged there; PRs may be re-applied to the monorepo for downstream changes.

## Local setup

```bash
git clone https://github.com/LoopVerses/Kill-Switch-SDK-Agent.git
cd Kill-Switch-SDK-Agent
pnpm install
pnpm --filter @agent-killswitch/shared-types build
pnpm --filter @agent-killswitch/sdk-node build
pnpm --filter @agent-killswitch/sdk-node test
```

Node.js **≥ 20.10** is required (`AbortSignal.any`, `AbortSignal.timeout`, `crypto.subtle`).

## Quality bar

Every PR must:

1. **Pass `pnpm --filter @agent-killswitch/sdk-node typecheck`** — strict TS, no `any` outside well-justified callsites.
2. **Pass `pnpm --filter @agent-killswitch/sdk-node test`** — unit tests live in `src/client.test.ts` and run under `node --test` with `tsx`.
3. **Pass `pnpm --filter @agent-killswitch/sdk-node build`** — emits valid `.d.ts` artefacts.
4. **Pass `pnpm format:check`** (Prettier).
5. **Pass `pnpm lint`** (ESLint where configured).
6. **Add or update tests** when changing behaviour. Inject a fake `fetch` — don't dial the network.
7. **Update [`CHANGELOG.md`](./CHANGELOG.md)** under an `Unreleased` heading if a public surface changes.
8. **Bump `src/version.ts`** + `package.json` `version` in lockstep on every release commit.

## Coding conventions

- **ESM only.** Use `.js` extensions on internal imports — TypeScript resolves them to `.ts` source.
- **No runtime dependencies** beyond `@agent-killswitch/shared-types`. The SDK is _boring_ on purpose.
- **No `eval` / `Function` constructor.** Edge runtimes must run the bundle unmodified.
- **Web APIs over Node-specific APIs** wherever possible (`fetch`, `AbortSignal`, `crypto.subtle`).
- **Errors:** every thrown error is a subclass of `KillSwitchError`. Add `instanceof`-friendly subclasses when introducing new failure modes.
- **Redaction first:** any string the user might see in an error must pass through `redactSensitiveStrings` if it could possibly contain a credential.

## Commit / PR style

- Conventional commits preferred (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- One logical change per PR. Bundle docs/test updates with the code change they describe.
- For breaking changes, explain the migration path in the PR body and update [Migration guide](./README.md#migration-guide) in the README.

## Reporting bugs

Open a GitHub issue with:

- SDK version (`require('@agent-killswitch/sdk-node/package.json').version`).
- Node.js / runtime version.
- A minimal reproduction that uses an injected `fetch` (so the issue doesn't depend on your server).
- Expected vs. actual behaviour, plus any error output (after redaction).

## Security issues

**Do not file public issues for security reports.** Use the channels documented in [`SECURITY.md`](./SECURITY.md).

## License

By contributing, you agree your contributions will be licensed under the project's [MIT License](./LICENSE).
