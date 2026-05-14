import {
  APIConnectionError,
  APIUserAbortError,
  killSwitchErrorFromResponse,
  redactSensitiveStrings,
} from '../errors.js';
import type { Hooks, RequestContext, ResponseContext, RetryContext } from '../hooks.js';
import { type Logger, NoopLogger } from '../logger.js';
import { type SigningConfig, signRequest } from '../security/signing.js';
import { assertSafeRequestPath, sanitizeHeaderRecord } from '../security/transport.js';
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
  hooks?: Hooks;
  logger?: Logger;
  signing?: SigningConfig;
};

const BUILT_IN_HEADER_NAMES = new Set([
  'authorization',
  'content-type',
  'user-agent',
  'x-api-key',
  'idempotency-key',
  'x-request-id',
  'x-aks-key-id',
  'x-aks-signed-at',
  'x-aks-nonce',
  'x-aks-signature',
]);

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
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function parseRetryAfter(res: Response): number | undefined {
  const raw = res.headers.get('retry-after');
  if (!raw) return undefined;
  const sec = Number(raw);
  if (!Number.isNaN(sec) && sec >= 0) return Math.min(sec * 1000, 60_000);
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) return Math.max(0, Math.min(date - Date.now(), 60_000));
  return undefined;
}

function backoffMs(attempt: number, res?: Response): number {
  const ra = res ? parseRetryAfter(res) : undefined;
  if (ra !== undefined) return ra;
  const base = 100 * 2 ** attempt;
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.min(base * jitter, 8_000);
}

function isAbortError(e: unknown): boolean {
  if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
    return e.name === 'AbortError' || e.name === 'TimeoutError';
  }
  if (e instanceof Error) return e.name === 'AbortError' || e.name === 'TimeoutError';
  return false;
}

function isTimeoutError(e: unknown): boolean {
  if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
    return e.name === 'TimeoutError';
  }
  return e instanceof Error && e.name === 'TimeoutError';
}

function newRequestId(): string {
  // Prefer Web Crypto UUID when available; fall back to a v4-shaped hex.
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const rnd = (n: number) =>
    Math.floor(Math.random() * 16 ** n)
      .toString(16)
      .padStart(n, '0');
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-${rnd(4)}-${rnd(12)}`;
}

export class RequestRunner {
  constructor(private readonly opts: RunnerOptions) {}

  private buildHeaders(
    jsonBody: boolean,
    requestId: string,
    perCall?: RequestCallOptions
  ): Headers {
    const merged: Record<string, string> = { ...this.opts.defaultHeaders };
    if (perCall?.headers) {
      for (const [k, v] of Object.entries(sanitizeHeaderRecord(perCall.headers))) {
        // Block per-call overrides of built-in headers — those are authoritative.
        if (BUILT_IN_HEADER_NAMES.has(k.toLowerCase())) continue;
        merged[k] = v;
      }
    }
    const h = new Headers(merged);
    h.set('User-Agent', `AgentKillSwitch-JS/${VERSION}`);
    h.set('X-Request-Id', requestId);
    if (jsonBody) h.set('Content-Type', 'application/json');
    if (this.opts.apiKey) h.set('X-Api-Key', this.opts.apiKey);
    if (this.opts.bearerToken) h.set('Authorization', `Bearer ${this.opts.bearerToken}`);
    if (perCall?.idempotencyKey) h.set('Idempotency-Key', perCall.idempotencyKey);
    return h;
  }

  /**
   * Perform fetch with timeout, capped exponential backoff with jitter for
   * retriable HTTP statuses and connection errors, lifecycle hooks, and
   * optional HMAC request signing.
   */
  async fetch(
    method: string,
    path: string,
    init?: {
      body?: unknown;
      jsonBody?: boolean;
      call?: RequestCallOptions;
    }
  ): Promise<Response> {
    assertSafeRequestPath(path);
    const upperMethod = method.toUpperCase();
    const jsonBody = init?.jsonBody ?? init?.body !== undefined;
    const url = `${this.opts.baseURL}${path}`;
    const bodyString = init?.body !== undefined ? JSON.stringify(init.body) : undefined;
    const callTimeout = init?.call?.timeout ?? this.opts.timeout;
    const max = this.opts.maxRetries;
    const requestId = init?.call?.requestId ?? newRequestId();
    const logger = this.opts.logger ?? NoopLogger;
    const hooks = this.opts.hooks;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= max; attempt++) {
      const headers = this.buildHeaders(jsonBody, requestId, init?.call);
      if (this.opts.signing) {
        await signRequest(this.opts.signing, upperMethod, path, bodyString, headers);
      }
      const ctx: RequestContext = {
        method: upperMethod,
        path,
        url,
        headers,
        attempt,
        requestId,
      };
      if (hooks?.onRequest) await hooks.onRequest(ctx);

      const startedAt = Date.now();
      const signal = abortSignalForCall(callTimeout, init?.call?.signal);

      try {
        const res = await this.opts.fetchImpl(url, {
          method: upperMethod,
          headers,
          body: bodyString,
          signal,
        });
        const respCtx: ResponseContext = {
          ...ctx,
          response: res,
          durationMs: Date.now() - startedAt,
        };
        if (hooks?.onResponse) await hooks.onResponse(respCtx);

        if (isRetriableStatus(res.status) && attempt < max) {
          const wait = backoffMs(attempt, res);
          if (hooks?.onRetry) await hooks.onRetry({ ...ctx, waitMs: wait, cause: res.status });
          logger.warn('killswitch.retry', {
            method: upperMethod,
            path,
            status: res.status,
            attempt,
            waitMs: wait,
            requestId,
          });
          await res.arrayBuffer().catch(() => undefined);
          await sleep(wait);
          continue;
        }

        return res;
      } catch (e) {
        lastErr = e;
        if (isAbortError(e)) {
          // Caller's signal aborted explicitly — re-throw immediately.
          if (init?.call?.signal?.aborted) throw new APIUserAbortError();
          // Timeout branch — throw a user-abort error with a descriptive message.
          if (isTimeoutError(e)) {
            throw new APIUserAbortError(`Request timed out after ${callTimeout}ms`);
          }
          throw new APIUserAbortError();
        }
        const msg = redactSensitiveStrings(e instanceof Error ? e.message : String(e));
        if (attempt < max) {
          const wait = backoffMs(attempt);
          if (hooks?.onRetry) {
            await hooks.onRetry({
              ...ctx,
              waitMs: wait,
              cause: e instanceof Error ? e : new Error(msg),
            });
          }
          logger.warn('killswitch.retry', {
            method: upperMethod,
            path,
            attempt,
            waitMs: wait,
            requestId,
            error: msg,
          });
          await sleep(wait);
          continue;
        }
        logger.error('killswitch.connection_error', {
          method: upperMethod,
          path,
          requestId,
          error: msg,
        });
        throw new APIConnectionError(`Connection error while calling ${method} ${path}: ${msg}`, {
          cause: e,
        });
      }
    }

    throw new APIConnectionError(`Connection error while calling ${method} ${path}`, {
      cause: lastErr,
    });
  }

  async requestJson<T>(
    method: string,
    path: string,
    init: {
      body?: unknown;
      okStatuses: number[];
      call?: RequestCallOptions;
    }
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
