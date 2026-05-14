import { APIConnectionError, APIUserAbortError, killSwitchErrorFromResponse, redactSensitiveStrings } from '../errors.js';
import { assertSafeRequestPath } from '../security/transport.js';
import { VERSION } from '../version.js';
import type { RequestCallOptions } from '../resources/types.js';

export type RunnerOptions = {
  baseURL: string;
  apiKey?: string;
  bearerToken?: string;
  fetchImpl: typeof fetch;
  defaultHeaders: Record<string, string>;
  /** Milliseconds; `0` disables client-side timeout (still respects `signal`). */
  timeout: number;
  maxRetries: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function abortSignalForCall(timeoutMs: number, user?: AbortSignal): AbortSignal {
  if (timeoutMs <= 0) {
    return user ?? new AbortController().signal;
  }
  const deadline = AbortSignal.timeout(timeoutMs);
  return user ? AbortSignal.any([deadline, user]) : deadline;
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function backoffMs(attempt: number, res?: Response): number {
  const ra = res?.headers.get('retry-after');
  if (ra) {
    const sec = Number(ra);
    if (!Number.isNaN(sec) && sec >= 0) return Math.min(sec * 1000, 60_000);
  }
  const base = 100 * 2 ** attempt;
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.min(base * jitter, 8_000);
}

function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') ||
    (e instanceof Error && e.name === 'AbortError')
  );
}

export class RequestRunner {
  constructor(private readonly opts: RunnerOptions) {}

  private buildHeaders(json: boolean): Headers {
    const h = new Headers(this.opts.defaultHeaders);
    h.set('User-Agent', `AgentKillSwitch-JS/${VERSION}`);
    if (json) h.set('Content-Type', 'application/json');
    if (this.opts.apiKey) h.set('X-Api-Key', this.opts.apiKey);
    if (this.opts.bearerToken) h.set('Authorization', `Bearer ${this.opts.bearerToken}`);
    return h;
  }

  /**
   * Performs fetch with timeout, optional retries on transient HTTP failures and connection errors.
   */
  async fetch(
    method: string,
    path: string,
    init?: {
      body?: unknown;
      jsonBody?: boolean;
      call?: RequestCallOptions;
    },
  ): Promise<Response> {
    assertSafeRequestPath(path);
    const jsonBody = init?.jsonBody ?? init?.body !== undefined;
    const url = `${this.opts.baseURL}${path}`;
    const body = init?.body !== undefined ? JSON.stringify(init.body) : undefined;
    const max = this.opts.maxRetries;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= max; attempt++) {
      const signal = abortSignalForCall(this.opts.timeout, init?.call?.signal);
      try {
        const res = await this.opts.fetchImpl(url, {
          method,
          headers: this.buildHeaders(jsonBody),
          body,
          signal,
        });

        if (isRetriableStatus(res.status) && attempt < max) {
          await res.arrayBuffer().catch(() => undefined);
          await sleep(backoffMs(attempt, res));
          continue;
        }

        return res;
      } catch (e) {
        lastErr = e;
        if (isAbortError(e)) {
          if (init?.call?.signal?.aborted) throw new APIUserAbortError();
          throw new APIUserAbortError('Request timed out');
        }
        const msg = redactSensitiveStrings(e instanceof Error ? e.message : String(e));
        if (attempt < max) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new APIConnectionError(`Connection error while calling ${method} ${path}: ${msg}`, {
          cause: e,
        });
      }
    }

    throw new APIConnectionError(`Connection error while calling ${method} ${path}`, { cause: lastErr });
  }

  async requestJson<T>(
    method: string,
    path: string,
    init: {
      body?: unknown;
      okStatuses: number[];
      call?: RequestCallOptions;
    },
  ): Promise<T> {
    const res = await this.fetch(method, path, {
      body: init.body,
      jsonBody: init.body !== undefined,
      call: init.call,
    });
    if (!init.okStatuses.includes(res.status)) {
      throw await killSwitchErrorFromResponse(res);
    }
    return (await res.json()) as T;
  }
}
