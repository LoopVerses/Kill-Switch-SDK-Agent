/** Per-request overrides — hyperscaler-style, mergeable with client defaults. */
export type RequestCallOptions = {
  /** Abort the in-flight request (merged with the client-side timeout via `AbortSignal.any`). */
  signal?: AbortSignal;
  /**
   * Headers to add for this call only. Merged on top of client `defaultHeaders`
   * and overridden by built-in headers (auth, `User-Agent`, `Content-Type`,
   * `Idempotency-Key`, `X-Request-Id`). Sanitized for CR/LF/NUL.
   */
  headers?: Record<string, string>;
  /**
   * Per-call timeout override in milliseconds. Falls back to the client-level
   * `timeout`. Pass `0` to disable the SDK timeout for this call (the caller
   * `signal` is still honoured).
   */
  timeout?: number;
  /**
   * Sent as the `Idempotency-Key` header. Servers MUST treat repeat requests
   * with the same key as a single logical operation. Recommended for any
   * non-GET call your runtime might retry — including outside this SDK.
   */
  idempotencyKey?: string;
  /**
   * Override the auto-generated `X-Request-Id`. Use this to stitch the SDK
   * request to an upstream correlation/trace ID.
   */
  requestId?: string;
};
