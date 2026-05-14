/**
 * Lifecycle hooks. Useful for distributed tracing, metrics, audit, and
 * platform-specific request enrichment without forking the SDK.
 *
 * All hooks may be `async`. They run in declaration order. Throwing from a
 * hook aborts the request with the thrown error (wrap your own errors in
 * `KillSwitchError` if you want consistent typing).
 */

export type RequestContext = {
  /** Uppercased HTTP method (`GET`, `POST`, …). */
  readonly method: string;
  /** Path under `baseURL`, starting with `/`. */
  readonly path: string;
  /** Fully-qualified URL the SDK is about to call. */
  readonly url: string;
  /**
   * Mutable header map. Hooks may add or replace values; the SDK sanitizes
   * CR/LF/NUL before sending so injection attempts will throw.
   */
  readonly headers: Headers;
  /** 0-based attempt index (0 = first attempt, 1 = first retry, …). */
  readonly attempt: number;
  /** Unique-per-call request ID — also surfaced as the `X-Request-Id` header. */
  readonly requestId: string;
};

export type ResponseContext = RequestContext & {
  readonly response: Response;
  /** Wall-clock duration in milliseconds. */
  readonly durationMs: number;
};

export type RetryContext = RequestContext & {
  /** Sleep before the next attempt, milliseconds. */
  readonly waitMs: number;
  /** Reason for retry — HTTP status (number) or a thrown error. */
  readonly cause: number | Error;
};

export interface Hooks {
  onRequest?: (ctx: RequestContext) => void | Promise<void>;
  onResponse?: (ctx: ResponseContext) => void | Promise<void>;
  onRetry?: (ctx: RetryContext) => void | Promise<void>;
}
