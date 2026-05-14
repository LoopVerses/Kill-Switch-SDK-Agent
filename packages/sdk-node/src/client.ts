import { RequestRunner } from './core/runner.js';
import { KillSwitchError } from './errors.js';
import { sanitizeHeaderRecord, validateApiOrigin } from './security/transport.js';
import { Agents, type RegisterAgentInput } from './resources/agents.js';
import { Health } from './resources/health.js';
import { Kill, type RecordKillInput } from './resources/kill.js';
import { Telemetry } from './resources/telemetry.js';
import type { RequestCallOptions } from './resources/types.js';

const CRLF_OR_NUL = /[\r\n\0]/;

export type AgentKillSwitchOptions = {
  /** API origin, e.g. `https://api.example.com` (no trailing slash required). */
  baseURL?: string;
  /** @deprecated Use {@link AgentKillSwitchOptions.baseURL} */
  baseUrl?: string;
  apiKey?: string;
  bearerToken?: string;
  /** Custom `fetch` implementation (tests, proxies, edge runtimes). */
  fetch?: typeof fetch;
  /** @deprecated Use {@link AgentKillSwitchOptions.fetch} */
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
  /**
   * Per-request timeout in milliseconds (merged with optional per-call `signal`).
   * Default `60000`. Set `0` to disable the client-side timeout.
   */
  timeout?: number;
  /**
   * After the first attempt, how many *additional* tries to run for retriable HTTP status
   * (408, 429, 5xx) and connection errors. Default `2`.
   */
  maxRetries?: number;
  /**
   * Allow `http://` base URLs (e.g. local dev). **Default false** — production should use TLS (`https:`).
   */
  dangerouslyAllowInsecureHttp?: boolean;
};

/** @deprecated Use {@link AgentKillSwitchOptions} */
export type ClientOptions = AgentKillSwitchOptions;

/**
 * Production-grade client for the Agent Kill Switch HTTP API.
 *
 * Prefer the nested API (`agents`, `telemetry`, `kill`, `health`) for clarity; flat methods
 * remain for backward compatibility.
 */
export class AgentKillSwitch {
  readonly agents: Agents;
  readonly telemetry: Telemetry;
  readonly kill: Kill;
  readonly health: Health;

  constructor(opts: AgentKillSwitchOptions) {
    const raw = opts.baseURL ?? opts.baseUrl;
    if (!raw?.trim()) {
      throw new KillSwitchError('AgentKillSwitch requires `baseURL` (or `baseUrl`).');
    }
    const allowInsecure = opts.dangerouslyAllowInsecureHttp === true;
    const baseURL = validateApiOrigin(raw, allowInsecure);
    const fetchImpl = opts.fetch ?? opts.fetchImpl ?? globalThis.fetch;
    if (opts.apiKey && CRLF_OR_NUL.test(opts.apiKey)) {
      throw new KillSwitchError('apiKey must not contain CR, LF, or NUL.');
    }
    if (opts.bearerToken && CRLF_OR_NUL.test(opts.bearerToken)) {
      throw new KillSwitchError('bearerToken must not contain CR, LF, or NUL.');
    }
    const defaultHeaders = sanitizeHeaderRecord(
      opts.defaultHeaders && Object.keys(opts.defaultHeaders).length > 0 ? { ...opts.defaultHeaders } : {},
    );
    const runner = new RequestRunner({
      baseURL,
      apiKey: opts.apiKey,
      bearerToken: opts.bearerToken,
      fetchImpl,
      defaultHeaders,
      timeout: opts.timeout ?? 60_000,
      maxRetries: opts.maxRetries ?? 2,
    });
    this.agents = new Agents(runner);
    this.telemetry = new Telemetry(runner);
    this.kill = new Kill(runner);
    this.health = new Health(runner);
  }

  // --- Legacy flat surface (kept for stable imports) ---

  /** @deprecated Use {@link Health.check} */
  healthz(call?: RequestCallOptions): Promise<{ status: string }> {
    return this.health.check(call);
  }

  /** @deprecated Use {@link Kill.latest} */
  getLastKill(agentExternalRef: string, call?: RequestCallOptions) {
    return this.kill.latest(agentExternalRef, call);
  }

  /** @deprecated Use {@link Telemetry.sendBatch} */
  sendTelemetryBatch(events: Record<string, unknown>[], call?: RequestCallOptions) {
    return this.telemetry.sendBatch(events, call);
  }

  /** @deprecated Use {@link Agents.register} */
  registerAgent(input: RegisterAgentInput, call?: RequestCallOptions) {
    return this.agents.register(input, call);
  }

  /** @deprecated Use {@link Agents.list} */
  listAgents(limit?: number, call?: RequestCallOptions) {
    return this.agents.list(limit, call);
  }

  /** @deprecated Use {@link Kill.record} */
  recordKill(input: RecordKillInput, call?: RequestCallOptions) {
    return this.kill.record(input, call);
  }

  /** @deprecated Use {@link Kill.evaluate} */
  evaluateKill(agentExternalRef: string, call?: RequestCallOptions) {
    return this.kill.evaluate(agentExternalRef, call);
  }
}

/** @deprecated Use {@link AgentKillSwitch} */
export const KillSwitchClient = AgentKillSwitch;
